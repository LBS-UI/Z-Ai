/**
 * Zimelia Personality System (v1.1)
 *
 * Separate from the conversation manager and ZUS.
 * Consumes intent, context, and optional emotion signals.
 * Template-based — not general AI understanding.
 *
 * Public API (unchanged):
 * - constructor(options)
 * - respond(userText, context, emotionSignal) -> { text, strategy, tone }
 * - resetSession()
 * - updateConfig(partial)
 * - getConfig()
 */

import { RESPONSE_TEMPLATES, createPersonalityConfig } from "./personality-config.js";

const VALID_TONES = [
  "warm", "playful", "serious", "caring",
  "thoughtful", "curious", "reassuring", "focused"
];

export class PersonalitySystem {
  /**
   * @param {Object} [options]
   * @param {Object} [options.config]
   */
  constructor(options = {}) {
    this.config = createPersonalityConfig(options.config || {});
    this.recentTemplates = [];
    this.maxRecent = 16;
    this._lastStrategy = null;
  }

  /**
   * @param {string} userText
   * @param {Object} context
   * @param {Object} [emotionSignal] { label, confidence, uncertain }
   * @returns {{ text: string, strategy: string, tone: string }}
   */
  respond(userText, context, emotionSignal = null) {
    const ctx = context && typeof context === "object" ? context : {};
    const intent = ctx.intent || "unclear";
    const tone = this._chooseTone(userText, ctx, emotionSignal);
    let strategy = this._chooseStrategy(intent, tone, ctx, userText);

    // Only ask when the message is mixed and intent is not already clear
    if (this._shouldAskIntent(intent, userText, ctx)) {
      strategy = "clarify_intent";
    }

    const text = this._buildReply(strategy, tone, ctx, userText);
    this._lastStrategy = strategy;
    return { text, strategy, tone };
  }

  resetSession() {
    this.recentTemplates = [];
    this._lastStrategy = null;
  }

  updateConfig(partial) {
    this.config = createPersonalityConfig({ ...this.config, ...partial });
  }

  getConfig() {
    return this.config;
  }

  // ---------- tone ----------

  _chooseTone(userText, context, emotionSignal) {
    const emotion = this._interpretEmotion(emotionSignal);
    const intent = context.intent || "unclear";
    const text = String(userText || "");

    // Emotion signal only if trusted
    if (emotion === "sadness" || emotion === "nervousness") return "caring";
    if (emotion === "frustration" || emotion === "anger") return "reassuring";
    if (emotion === "confusion") return "thoughtful";
    if (emotion === "happiness" || emotion === "excitement") return "warm";

    if (intent === "venting") return "caring";
    if (intent === "advice_seeking") return "thoughtful";
    if (intent === "follow_up") return "curious";
    if (intent === "request" || this._looksTechnical(text, context)) return "focused";
    if (intent === "greeting") {
      return (this.config.communicationStyle?.playfulness || 0) > 0.5 ? "playful" : "warm";
    }

    // Do not treat a single serious word (e.g. "death" in biology) as distress
    if (this._isSensitiveContext(text, context)) return "serious";

    return "warm";
  }

  /**
   * Ignore uncertain or low-confidence signals.
   * Threshold comes from config (default 0.5).
   */
  _interpretEmotion(signal) {
    if (!signal || typeof signal !== "object") return null;
    if (signal.uncertain === true) return null;
    const threshold = this.config.emotion?.confidenceThreshold ?? 0.5;
    if (typeof signal.confidence === "number" && signal.confidence < threshold) return null;
    return signal.label || null;
  }

  _isSensitiveContext(text, context) {
    const t = String(text || "").toLowerCase();
    // Personal distress, not bare keywords
    return /\b(i('m| am) (sad|scared|overwhelmed|anxious)|i feel (sad|lost|hopeless)|this hurts|i can't cope)\b/.test(t)
      || context.intent === "venting";
  }

  _looksTechnical(text, context) {
    const t = String(text || "").toLowerCase();
    const topic = String(context.currentTopic || "").toLowerCase();
    return /\b(code|javascript|bug|error|function|api|script|syntax)\b/.test(t + " " + topic);
  }

  // ---------- strategy ----------

  _chooseStrategy(intent, tone, context, userText) {
    const text = String(userText || "").toLowerCase().trim();
    const last = (context.lastUserMessage || "").trim();

    if (!text || text.length <= 2 || text === "?") return "uncertainty";

    // Follow-up that says they still don't get it → rephrase
    if (intent === "follow_up" && /\b(still don't|don't understand|dont understand|huh|what do you mean)\b/.test(text)) {
      return "rephrase_explanation";
    }
    if (intent === "follow_up") return "follow_up";

    if (intent === "greeting") return tone === "playful" ? "greeting_playful" : "greeting";
    if (intent === "venting") return "emotional_support";
    if (intent === "advice_seeking") return "advice";
    if (intent === "request" && this._looksTechnical(text, context)) return "technical_help";
    if (intent === "question") return "explanation";
    if (/\b(thanks|thank you|thx)\b/.test(text)) return "acknowledgment";
    if (/\b(bye|goodbye|see you|see ya)\b/.test(text)) return "farewell";

    if (tone === "serious") return "serious";
    if (tone === "caring") return "emotional_support";
    if (tone === "focused") return "technical_help";
    if (tone === "reassuring") return "encouragement";
    return "casual";
  }

  _shouldAskIntent(intent, userText, context) {
    if (intent !== "statement" && intent !== "unclear") return false;
    const t = String(userText || "");
    if (t.length < 40) return false;
    const hasEmotion = /\b(i feel|i'm (sad|upset|frustrated)|feeling)\b/i.test(t);
    const hasAdvice = /\b(should|advice|what do i do|help me)\b/i.test(t);
    return hasEmotion && hasAdvice;
  }

  // ---------- reply ----------

  _buildReply(strategy, tone, context, userText) {
    const topic = context.currentTopic || "that";
    let key = strategy;

    // Never use playful templates in serious/caring/focused tones
    if ((tone === "serious" || tone === "caring" || tone === "focused") &&
        (key === "greeting_playful" || key === "casual")) {
      key = tone === "focused" ? "technical_help" : "serious";
    }
    if (tone === "serious" && this.config.humor?.avoidInSerious && key === "greeting_playful") {
      key = "serious";
    }

    const text = this._pick(key, { topic });
    return this._applyLanguageFlavor(text, tone);
  }

  /**
   * Prefer unused templates. Safe if the category is missing or empty.
   */
  _pick(key, vars = {}) {
    const list = RESPONSE_TEMPLATES[key];
    const poolSource = Array.isArray(list) && list.length ? list : (RESPONSE_TEMPLATES.casual || ["I'm listening."]);
    const available = poolSource.filter(t => !this.recentTemplates.includes(key + "::" + t));
    const pool = available.length ? available : poolSource;
    const chosen = pool[Math.floor(Math.random() * pool.length)] || "I'm listening.";

    this.recentTemplates.push(key + "::" + chosen);
    if (this.recentTemplates.length > this.maxRecent) this.recentTemplates.shift();

    return String(chosen).replace(/\{topic\}/g, vars.topic || "that");
  }

  /**
   * Optional language flavor. Sparse. Never in serious/caring/focused.
   */
  _applyLanguageFlavor(text, tone) {
    const lang = this.config.language || {};
    if (!lang.allowFilipinoEnglish && !lang.allowJapanese) return text;
    if (tone === "serious" || tone === "caring" || tone === "focused" || tone === "reassuring") return text;
    if (Math.random() > 0.12) return text;

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
