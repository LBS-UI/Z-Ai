/**
 * Zimelia Personality System
 *
 * Separate from the conversation manager.
 * Uses context snapshots and optional emotion signals to choose tone and replies.
 * Template-based — does not claim general AI-level understanding.
 */

import { RESPONSE_TEMPLATES, createPersonalityConfig } from "./personality-config.js";

const SERIOUS_HINTS = /\b(sad|depressed|anxious|anxiety|stressed|overwhelmed|grief|died|death|breakup|hurt|scared|panic|crisis|serious)\b/i;
const PLAYFUL_HINTS = /\b(lol|lmao|haha|funny|joke|meme|silly|play)\b/i;

export class PersonalitySystem {
  /**
   * @param {Object} [options]
   * @param {Object} [options.config]  overrides for DEFAULT_PERSONALITY
   */
  constructor(options = {}) {
    this.config = createPersonalityConfig(options.config || {});
    this.recentTemplates = []; // session-only, to avoid repetition
    this.maxRecent = 12;
  }

  /**
   * Generate a reply from conversation context and optional emotion signal.
   *
   * @param {string} userText
   * @param {Object} context  from ConversationManager.getContext()
   * @param {Object} [emotionSignal]  { label?: string, confidence?: number, uncertain?: boolean }
   * @returns {{ text: string, strategy: string, tone: string }}
   */
  respond(userText, context, emotionSignal = null) {
    const intent = context?.intent || "unclear";
    const tone = this._chooseTone(userText, context, emotionSignal);
    const strategy = this._chooseStrategy(intent, tone, context);

    // If intent is mixed / unclear and user might want different kinds of help
    if (this._shouldAskIntent(intent, userText, context)) {
      const text = this._pick("clarify_intent", { topic: context?.currentTopic });
      return { text, strategy: "clarify_intent", tone };
    }

    const text = this._buildReply(strategy, tone, context, userText);
    return { text, strategy, tone };
  }

  /**
   * Reset session-only repetition tracking.
   */
  resetSession() {
    this.recentTemplates = [];
  }

  /**
   * Update config at runtime (tone, language, templates, etc.).
   * @param {Object} partial
   */
  updateConfig(partial) {
    this.config = createPersonalityConfig({ ...this.config, ...partial });
  }

  getConfig() {
    return this.config;
  }

  // ---------- internal ----------

  _chooseTone(userText, context, emotionSignal) {
    const text = String(userText || "");
    const emotion = this._interpretEmotion(emotionSignal);

    if (emotion === "sad" || emotion === "anxious" || emotion === "angry" || SERIOUS_HINTS.test(text)) {
      return "serious";
    }
    if (emotion === "playful" || PLAYFUL_HINTS.test(text)) {
      return "playful";
    }
    if (context?.intent === "venting") return "caring";
    if (context?.intent === "advice_seeking") return "thoughtful";
    if (context?.intent === "greeting") return this.config.communicationStyle.playfulness > 0.5 ? "playful" : "warm";
    return "warm";
  }

  /**
   * Emotion signals are optional and may be uncertain.
   * Low confidence or uncertain flag → ignore the label.
   */
  _interpretEmotion(signal) {
    if (!signal || typeof signal !== "object") return null;
    if (signal.uncertain === true) return null;
    if (typeof signal.confidence === "number" && signal.confidence < 0.5) return null;
    return signal.label || null;
  }

  _chooseStrategy(intent, tone, context) {
    const last = (context?.lastUserMessage || "").trim();
    if (last.length <= 2 || intent === "unclear") return "uncertainty";
    if (intent === "greeting") return tone === "playful" ? "greeting_playful" : "greeting";
    if (intent === "follow_up") return "follow_up";
    if (intent === "venting") return "emotional_support";
    if (intent === "advice_seeking") return "advice";
    if (intent === "question") return "explanation";
    if (tone === "serious") return "serious";
    return "casual";
  }

  _shouldAskIntent(intent, userText, context) {
    // Only when the message is long enough to be mixed and we have no clear intent
    if (intent !== "statement" && intent !== "unclear") return false;
    const t = String(userText || "");
    if (t.length < 40) return false;
    // Mixed signals: both emotional and advice-like
    const hasEmotion = SERIOUS_HINTS.test(t) || /\b(feel|feeling|upset)\b/i.test(t);
    const hasAdvice = /\b(should|advice|what do i do|help me)\b/i.test(t);
    return hasEmotion && hasAdvice;
  }

  _buildReply(strategy, tone, context, userText) {
    const topic = context?.currentTopic || "that";
    let key = strategy;

    // Downgrade playful templates in serious tone
    if (tone === "serious" && (key === "greeting_playful" || key === "casual")) {
      key = "serious";
    }
    if (tone === "serious" && this.config.humor.avoidInSerious) {
      // no joke injection
    }

    const text = this._pick(key, { topic });
    return this._applyLanguageFlavor(text, tone);
  }

  /**
   * Pick a template that wasn't used recently in this session.
   */
  _pick(key, vars = {}) {
    const list = RESPONSE_TEMPLATES[key] || RESPONSE_TEMPLATES.casual;
    const available = list.filter(t => !this.recentTemplates.includes(key + "::" + t));
    const pool = available.length ? available : list;
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    this.recentTemplates.push(key + "::" + chosen);
    if (this.recentTemplates.length > this.maxRecent) this.recentTemplates.shift();

    return chosen.replace(/\{topic\}/g, vars.topic || "that");
  }

  /**
   * Light, optional language flavor. Never forced.
   */
  _applyLanguageFlavor(text, tone) {
    const lang = this.config.language;
    if (!lang.allowFilipinoEnglish && !lang.allowJapanese) return text;
    // Only occasionally, and never in serious tone
    if (tone === "serious") return text;
    if (Math.random() > 0.15) return text;

    if (lang.allowFilipinoEnglish && Math.random() < 0.5) {
      return text + " Sige.";
    }
    if (lang.allowJapanese) {
      return text + " うん.";
    }
    return text;
  }
}

export function createPersonality(options) {
  return new PersonalitySystem(options);
}
