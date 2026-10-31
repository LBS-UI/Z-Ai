/**
 * Zimelia Conversation Manager
 * Tracks temporary conversational context (not persistent memory).
 *
 * Designed to be UI-independent so it can later power a desktop companion.
 * Rule-based only — does not claim full natural-language understanding.
 */

const DEFAULT_MAX_HISTORY = 24;

const INTENTS = [
  "greeting",
  "question",
  "request",
  "storytelling",
  "venting",
  "advice_seeking",
  "follow_up",
  "unclear",
  "statement"
];

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {"user"|"assistant"|"system"} role
 * @property {string} content
 * @property {number} timestamp
 * @property {string} conversationId
 * @property {string} [intent]
 */

/**
 * @typedef {Object} ContextSnapshot
 * @property {string} conversationId
 * @property {string|null} currentTopic
 * @property {string[]} recentQuestions
 * @property {string[]} unresolvedQuestions
 * @property {Message[]} recentMessages
 * @property {string|null} lastUserMessage
 * @property {string|null} lastAssistantMessage
 * @property {string|null} referencedMessageId
 * @property {boolean} needsClarification
 * @property {string|null} clarificationReason
 * @property {string} intent
 * @property {Object} emotionInterface  // placeholder for future emotion engine
 * @property {Object} memoryInterface   // placeholder for future persistent memory
 */

export class ConversationManager {
  /**
   * @param {Object} [options]
   * @param {number} [options.maxHistory]
   * @param {string} [options.conversationId]
   */
  constructor(options = {}) {
    this.maxHistory = options.maxHistory || DEFAULT_MAX_HISTORY;
    this.conversationId = options.conversationId || this._generateId("conv");
    this.history = [];
    this.currentTopic = null;
    this.recentQuestions = [];
    this.unresolvedQuestions = [];
    this._processedIds = new Set();
    this._lastProcessedContent = null;
  }

  /**
   * Add a message to the temporary history.
   * Ignores empty content and exact consecutive duplicates.
   * @param {"user"|"assistant"|"system"} role
   * @param {string} content
   * @param {Object} [meta]
   * @returns {Message|null}
   */
  addMessage(role, content, meta = {}) {
    if (role !== "user" && role !== "assistant" && role !== "system") return null;
    const text = String(content || "").trim();
    if (!text) return null;

    // Prevent exact consecutive duplicate processing
    const fingerprint = role + ":" + text;
    if (fingerprint === this._lastProcessedContent) return null;
    this._lastProcessedContent = fingerprint;

    const msg = {
      id: meta.id || this._generateId("msg"),
      role,
      content: text,
      timestamp: meta.timestamp || Date.now(),
      conversationId: this.conversationId,
      intent: meta.intent || null
    };

    if (this._processedIds.has(msg.id)) return null;
    this._processedIds.add(msg.id);

    this.history.push(msg);
    while (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    if (role === "user") {
      this._updateFromUserMessage(msg);
    }

    return msg;
  }

  /**
   * Basic rule-based intent classification.
   * Prepared so a future intent engine can replace this.
   * @param {string} text
   * @returns {string}
   */
  classifyIntent(text) {
    const t = String(text || "").toLowerCase().trim();
    if (!t) return "unclear";

    if (/^(hi|hey|hello|yo|sup|hiya|howdy|good morning|good night)\b/.test(t) && t.length < 40) {
      return "greeting";
    }
    if (this._isFollowUp(t)) return "follow_up";
    if (/\b(i feel|i'm (sad|angry|frustrated|overwhelmed|stressed|anxious|upset)|this sucks|i hate)\b/.test(t)) {
      return "venting";
    }
    if (/\b(should i|what should i|any advice|what do you think|help me decide)\b/.test(t)) {
      return "advice_seeking";
    }
    if (/\b(tell me a story|once upon|story about|imagine if)\b/.test(t)) {
      return "storytelling";
    }
    if (/\b(can you|could you|please|i want you to|make|create|write|show me)\b/.test(t)) {
      return "request";
    }
    if (/\?$/.test(t) || /^(what|why|how|when|where|who|which|is|are|do|does|did|can|could)\b/.test(t)) {
      return "question";
    }
    if (t.length < 3) return "unclear";
    return "statement";
  }

  /**
   * Build a structured context object for future response modules.
   * @returns {ContextSnapshot}
   */
  getContext() {
    const recent = this.history.slice(-8);
    const lastUser = this._lastOfRole("user");
    const lastAssistant = this._lastOfRole("assistant");
    const intent = lastUser ? this.classifyIntent(lastUser.content) : "unclear";

    const followUp = lastUser ? this._resolveFollowUp(lastUser.content) : null;

    return {
      conversationId: this.conversationId,
      currentTopic: this.currentTopic,
      recentQuestions: this.recentQuestions.slice(-5),
      unresolvedQuestions: this.unresolvedQuestions.slice(-5),
      recentMessages: recent,
      lastUserMessage: lastUser ? lastUser.content : null,
      lastAssistantMessage: lastAssistant ? lastAssistant.content : null,
      referencedMessageId: followUp ? followUp.messageId : null,
      needsClarification: followUp ? followUp.needsClarification : false,
      clarificationReason: followUp ? followUp.reason : null,
      intent,
      // Placeholder interfaces — do not implement full engines here
      emotionInterface: {
        ready: false,
        getCurrentEmotion: () => null,
        onEmotionUpdate: null
      },
      memoryInterface: {
        ready: false,
        // Temporary context only. Persistent memory is a separate future module.
        getPersistent: () => [],
        noteForMemory: null
      }
    };
  }

  /**
   * Reset the current session (temporary context only).
   */
  resetSession() {
    this.history = [];
    this.currentTopic = null;
    this.recentQuestions = [];
    this.unresolvedQuestions = [];
    this._processedIds.clear();
    this._lastProcessedContent = null;
    this.conversationId = this._generateId("conv");
  }

  /**
   * Start a new conversation id while keeping the same manager instance.
   */
  newConversation() {
    this.resetSession();
  }

  getHistory() {
    return this.history.slice();
  }

  getLength() {
    return this.history.length;
  }

  // ---------- internal ----------

  _updateFromUserMessage(msg) {
    const text = msg.content;
    const intent = this.classifyIntent(text);
    msg.intent = intent;

    if (intent === "question") {
      this.recentQuestions.push(text);
      if (this.recentQuestions.length > 10) this.recentQuestions.shift();
      this.unresolvedQuestions.push(text);
      if (this.unresolvedQuestions.length > 10) this.unresolvedQuestions.shift();
    }

    // Simple topic extraction: use first meaningful noun-ish phrase or the message itself
    if (intent !== "follow_up" && intent !== "greeting" && intent !== "unclear") {
      const topic = this._extractTopic(text);
      if (topic && topic !== this.currentTopic) {
        this.currentTopic = topic;
      }
    }
  }

  _extractTopic(text) {
    const t = String(text || "").replace(/[?!.]/g, "").trim();
    if (!t) return null;
    // Prefer a short phrase after common question words
    const m = t.match(/^(?:what|why|how|how do i|tell me about|talk about|explain|what is|what are)\s+(.{3,50})/i);
    if (m) return m[1].trim().slice(0, 60);
    if (t.length <= 60) return t;
    return t.slice(0, 50).trim();
  }

  _isFollowUp(text) {
    const t = text.toLowerCase().trim();
    // Very short follow-ups only
    if (/^(why|how|and|huh|really)\??$/.test(t)) return true;
    if (t.length > 50) return false;
    return /^(what about|and that|that one|the second one|the first one|i tried that|what do you mean|ok but)\b/.test(t)
      || /\b(what about (the )?(second|first|other|last) one)\b/.test(t)
      || /\b(i tried that already)\b/.test(t);
  }

  /**
   * Attempt to link a follow-up to a previous message.
   * Returns needsClarification when the reference is ambiguous.
   */
  _resolveFollowUp(text) {
    if (!this._isFollowUp(text)) return null;

    const userMessages = this.history.filter(m => m.role === "user");
    const assistantMessages = this.history.filter(m => m.role === "assistant");

    // "the second one" style — look for numbered lists in last assistant message
    if (/\b(second|first|other|last) one\b/.test(text.toLowerCase())) {
      const lastA = assistantMessages[assistantMessages.length - 1];
      if (lastA && /(\d+\.|first|second|option|1\.|2\.)/i.test(lastA.content)) {
        return { messageId: lastA.id, needsClarification: false, reason: null };
      }
      return {
        messageId: null,
        needsClarification: true,
        reason: "Could not find a clear numbered list to reference."
      };
    }

    // "why?" / "i tried that already" — attach to last assistant or last substantive user message
    if (assistantMessages.length > 0) {
      return {
        messageId: assistantMessages[assistantMessages.length - 1].id,
        needsClarification: false,
        reason: null
      };
    }
    if (userMessages.length > 1) {
      return {
        messageId: userMessages[userMessages.length - 2].id,
        needsClarification: false,
        reason: null
      };
    }

    return {
      messageId: null,
      needsClarification: true,
      reason: "No previous message to connect this follow-up to."
    };
  }

  _lastOfRole(role) {
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].role === role) return this.history[i];
    }
    return null;
  }

  _generateId(prefix) {
    return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
  }
}

export function createConversationManager(options) {
  return new ConversationManager(options);
}
