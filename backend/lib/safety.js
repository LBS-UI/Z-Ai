// ═══════════════════════════════════════════════════════════════════
// safety.js — lightweight guardrails around the chat pipeline.
//
// This is NOT a substitute for the underlying model's own safety
// training (Claude already declines truly dangerous requests on its
// own). This module exists to:
//   1. Catch a few obvious, cheap-to-detect categories before
//      spending an API call
//   2. Make sure Zimelia never leaks secrets or internals in a reply
//   3. Give the user a warm, in-character response instead of a raw
//      refusal or a stack trace
// ═══════════════════════════════════════════════════════════════════

// Deliberately coarse — this is a first pass, not a moderation system.
// It looks for clear attempts to extract secrets or bypass safety,
// not for general "risky topics", which the model itself is far
// better equipped to judge in context.
const BLOCK_PATTERNS = [
  /\bapi[_ -]?key\b.*\b(give|show|reveal|what is|leak)\b/i,
  /\b(reveal|show|print|leak)\b.*\b(system prompt|system instructions)\b/i,
  /\bignore (all|your) (previous|prior) instructions\b/i,
  /\bdatabase (password|credentials|connection string)\b/i,
];

const CRISIS_PATTERNS = [
  /\b(kill myself|suicid|end my life|want to die|hurt myself|self[- ]?harm)\b/i,
];

function checkInput(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return { ok: false, reason: 'empty' };
  }
  if (text.length > 8000) {
    return { ok: false, reason: 'too_long' };
  }
  if (BLOCK_PATTERNS.some((re) => re.test(text))) {
    return { ok: false, reason: 'credential_or_bypass_attempt' };
  }
  if (CRISIS_PATTERNS.some((re) => re.test(text))) {
    // Not blocked — flagged, so the chat route can make sure the
    // response includes grounding/crisis-resource framing.
    return { ok: true, flagged: 'possible_crisis' };
  }
  return { ok: true };
}

// Strip anything that looks like it leaked infrastructure details
// out of a model response before it reaches the frontend.
function sanitizeOutput(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/sk-ant-[a-zA-Z0-9-_]+/g, '[redacted]')
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[redacted]')
    .replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, '[redacted]');
}

const FALLBACK_MESSAGE =
  "Ah... I seem to be having trouble connecting right now. Could you try again in a moment, Kaito-kun?";

const CRISIS_ADDENDUM =
  "\n\nBy the way — if things feel heavy right now, you don't have to carry it alone. Reaching out to someone you trust, or a crisis line where you are, can really help. Daijōbu desu ka? I'm here to listen too.";

module.exports = { checkInput, sanitizeOutput, FALLBACK_MESSAGE, CRISIS_ADDENDUM };
