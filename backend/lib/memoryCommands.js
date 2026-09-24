// ═══════════════════════════════════════════════════════════════════
// memoryCommands.js — detects explicit memory requests inside a chat
// message, e.g. "remember that I like purple". This is the ONLY path
// (besides the direct /api/memories endpoints) that writes to the
// memories table — nothing here is saved automatically or silently.
// ═══════════════════════════════════════════════════════════════════

const REMEMBER_RE = /^\s*(?:zimelia,?\s*)?(?:please\s+)?remember (?:that\s+)?(.+)$/i;
const FORGET_RE = /^\s*(?:zimelia,?\s*)?(?:please\s+)?forget (?:that\s+)?(.+)$/i;
const RECALL_RE = /^\s*(?:zimelia,?\s*)?what do you remember about me\??\s*$/i;
const CLEAR_RE = /^\s*(?:zimelia,?\s*)?clear (?:all\s+)?my memories\.?\s*$/i;

/**
 * Detects an explicit memory command in a raw user message.
 * Returns one of:
 *   { type: 'remember', text: '...' }
 *   { type: 'forget', text: '...' }
 *   { type: 'recall' }
 *   { type: 'clear' }
 *   null  — not a memory command, handle as a normal chat message
 */
function detectMemoryCommand(message) {
  const trimmed = message.trim();

  if (CLEAR_RE.test(trimmed)) return { type: 'clear' };
  if (RECALL_RE.test(trimmed)) return { type: 'recall' };

  const rememberMatch = trimmed.match(REMEMBER_RE);
  if (rememberMatch) return { type: 'remember', text: rememberMatch[1].trim().replace(/\.$/, '') };

  const forgetMatch = trimmed.match(FORGET_RE);
  if (forgetMatch) return { type: 'forget', text: forgetMatch[1].trim().replace(/\.$/, '') };

  return null;
}

/** Very rough auto-categorization; users/UI can always edit this. */
function guessCategory(text) {
  const t = text.toLowerCase();
  if (/\b(like|love|favorite|favourite|prefer|enjoy)\b/.test(t)) return 'preference';
  if (/\b(name is|birthday|live in|from|work as|study|studying)\b/.test(t)) return 'fact';
  if (/\b(goal|trying to|working on|plan to)\b/.test(t)) return 'goal';
  return 'general';
}

module.exports = { detectMemoryCommand, guessCategory };
