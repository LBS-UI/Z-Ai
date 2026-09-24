// ═══════════════════════════════════════════════════════════════════
// context.js — keeps conversations from growing unboundedly before
// they're sent to the AI provider.
// ═══════════════════════════════════════════════════════════════════

const MAX_MESSAGES = 24; // roughly last ~12 exchanges
const MAX_CHARS = 16000; // safety cap regardless of message count

/**
 * Given the full ordered list of messages for a conversation, return
 * the slice that should actually be sent to the model: the most
 * recent messages, trimmed to a character budget.
 *
 * If the conversation is longer than that, older turns are dropped
 * rather than sent — a lightweight stand-in for real summarization.
 * (See README for how to swap in true rolling summarization later.)
 */
function trimForContext(messages) {
  let recent = messages.slice(-MAX_MESSAGES);

  let totalChars = recent.reduce((sum, m) => sum + m.content.length, 0);
  while (totalChars > MAX_CHARS && recent.length > 2) {
    const dropped = recent.shift();
    totalChars -= dropped.content.length;
  }

  return recent;
}

module.exports = { trimForContext, MAX_MESSAGES, MAX_CHARS };
