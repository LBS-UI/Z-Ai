/**
 * Zimelia AI interface (conversation-aware, UI-independent)
 *
 * This module does not call external AI services.
 * It prepares structured context so a future personality module,
 * emotion engine, or local brain can generate replies.
 */

import { ConversationManager } from "./context-manager.js";
import { PersonalitySystem } from "./zimelia-personality.js";
import { EmotionEngine } from "./emotion-engine.js";

export class ZimeliaAI {
  /**
   * @param {Object} [options]
   * @param {ConversationManager} [options.conversation]
   * @param {Function} [options.fallbackResponder]  // optional existing local brain
   */
  constructor(options = {}) {
    this.conversation = options.conversation || new ConversationManager();
    this.personality = options.personality || new PersonalitySystem(options.personalityConfig || {});
    this.emotion = options.emotion || new EmotionEngine(options.emotionConfig || {});
    this.fallbackResponder = options.fallbackResponder || this._personalityOrDefault.bind(this);
  }

  /**
   * Process a user message and return a structured result.
   * @param {string} userText
   * @param {Object} [options]
   * @param {Object} [options.emotionSignal]  from a future emotion engine
   * @returns {Promise<{ message: string, context: Object, intent: string, source: string }>}
   */
  async handleMessage(userText, options = {}) {
    const text = String(userText || "").trim();
    if (!text) {
      return {
        message: "",
        context: this.conversation.getContext(),
        intent: "unclear",
        source: "empty"
      };
    }

    const userMsg = this.conversation.addMessage("user", text);
    if (!userMsg) {
      return {
        message: "",
        context: this.conversation.getContext(),
        intent: "unclear",
        source: "duplicate"
      };
    }

    const context = this.conversation.getContext();

    // Emotion analysis (heuristic). Does not generate the reply itself.
    const emotionResult = this.emotion.analyze(text, context);
    const emotionSignal = options.emotionSignal || this.emotion.toPersonalitySignal(emotionResult);

    // Conservative safety route — separate from emotion labels
    if (emotionResult.safety && emotionResult.safety.flag) {
      const reply = "If you're in immediate danger or thinking about hurting yourself, please reach out to local emergency services or a crisis line right now. I'm not a substitute for professional help, but I'm here if you want to talk.";
      this.conversation.addMessage("assistant", reply);
      return {
        message: reply,
        context: this.conversation.getContext(),
        intent: context.intent,
        source: "safety",
        emotion: emotionResult
      };
    }

    if (context.needsClarification) {
      const reply = this._clarificationReply(context);
      this.conversation.addMessage("assistant", reply);
      return {
        message: reply,
        context: this.conversation.getContext(),
        intent: context.intent,
        source: "clarification",
        emotion: emotionResult
      };
    }

    const reply = await this.fallbackResponder(text, context, emotionSignal);
    if (reply) {
      this.conversation.addMessage("assistant", reply);
    }

    return {
      message: reply || "",
      context: this.conversation.getContext(),
      intent: context.intent,
      source: "personality",
      emotion: emotionResult
    };
  }

  /**
   * Expose the current context snapshot for other modules.
   */
  getContext() {
    return this.conversation.getContext();
  }

  resetSession() {
    this.conversation.resetSession();
    if (this.personality && typeof this.personality.resetSession === "function") {
      this.personality.resetSession();
    }
    if (this.emotion && typeof this.emotion.clearHistory === "function") {
      this.emotion.clearHistory();
    }
  }

  getHistory() {
    return this.conversation.getHistory();
  }

  // ---------- internal ----------

  _clarificationReply(context) {
    if (context.clarificationReason && context.clarificationReason.includes("numbered")) {
      return "Which one do you mean? I don't see a clear list in the last reply.";
    }
    if (context.clarificationReason && context.clarificationReason.includes("No previous")) {
      return "Why what? I don't have earlier context for that yet.";
    }
    return "Can you point me to which part you're referring to?";
  }

  /**
   * Prefer the personality system. Fall back to the simple default if needed.
   */
  async _personalityOrDefault(text, context, emotionSignal) {
    if (this.personality) {
      const result = this.personality.respond(text, context, emotionSignal);
      if (result && result.text) return result.text;
    }
    return this._defaultFallback(text, context);
  }

  /**
   * Minimal deterministic fallback kept for safety.
   */
  _defaultFallback(text, context) {
    const intent = context.intent;
    if (intent === "greeting") return "Hey. What's on your mind?";
    if (intent === "follow_up" && context.currentTopic) {
      return "Still on " + context.currentTopic + ". What part should we look at?";
    }
    if (intent === "question") {
      return "Good question. My fuller reasoning isn't wired in yet — what are you trying to figure out?";
    }
    if (intent === "venting") return "That sounds rough. Want to tell me more, or just sit with it for a second?";
    if (intent === "advice_seeking") return "I can help you think it through. What's the main thing you're deciding?";
    if (intent === "unclear") return "I'm not sure what you mean. Can you say a bit more?";
    if (context.currentTopic) return "Got it. We're talking about " + context.currentTopic + ".";
    return "I'm listening.";
  }
}

export function createZimeliaAI(options) {
  return new ZimeliaAI(options);
}
