/**
 * Zimelia stable interface versions.
 * Other modules should depend on these shapes, not on internal fields.
 *
 * Bump MINOR for additive changes, MAJOR for breaking changes.
 */

export const INTERFACES = {
  conversation: "1.0.0",
  personality: "1.0.0",
  emotion: "1.0.0",
  voice: "1.0.0",
  ai: "1.0.0"
};

/**
 * ConversationManager public methods (v1):
 * - addMessage(role, content, meta?) -> Message | null
 * - getContext() -> ContextSnapshot
 * - classifyIntent(text) -> string
 * - getHistory() -> Message[]
 * - getLength() -> number
 * - resetSession()
 * - newConversation()
 *
 * ContextSnapshot (v1):
 * { conversationId, currentTopic, recentQuestions, unresolvedQuestions,
 *   recentMessages, lastUserMessage, lastAssistantMessage,
 *   referencedMessageId, needsClarification, clarificationReason,
 *   intent, emotionInterface, memoryInterface }
 */

/**
 * PersonalitySystem public methods (v1):
 * - respond(userText, context, emotionSignal?) -> { text, strategy, tone }
 * - resetSession()
 * - updateConfig(partial)
 * - getConfig()
 *
 * emotionSignal (v1):
 * { label, confidence, uncertain, mixed?, safety? }
 */

/**
 * EmotionEngine public methods (v1):
 * - analyze(text, context?) -> EmotionResult
 * - toPersonalitySignal(result) -> emotionSignal | null
 * - clearHistory()
 * - getRetained() -> []
 *
 * EmotionResult (v1):
 * { signals, primary, mixed, uncertain, uncertaintyReasons,
 *   supportingSignals, negated, safety, note }
 */

/**
 * ZimeliaAI public methods (v1):
 * - handleMessage(userText, options?) -> Promise<{ message, context, intent, source, emotion? }>
 * - getContext()
 * - resetSession()
 * - getHistory()
 */

/**
 * ZimeliaVoiceFX public methods (v1):
 * - initialize()
 * - setEnabled(bool)
 * - setIntensity(0..1)
 * - play(blob)
 */
export const INTERFACE_VERSION = "1.0.0";
