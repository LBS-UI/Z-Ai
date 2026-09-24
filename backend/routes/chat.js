// ═══════════════════════════════════════════════════════════════════
// chat.js — POST /api/chat
//
// Pipeline:
//   input validation → safety check → memory-command detection →
//   retrieve allowed memories → retrieve conversation context →
//   build AI request → AI response → output safety check →
//   return to frontend → persist conversation
// ═══════════════════════════════════════════════════════════════════

const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../db/database');
const { requireAuth } = require('../lib/auth');
const { checkInput, sanitizeOutput, FALLBACK_MESSAGE, CRISIS_ADDENDUM } = require('../lib/safety');
const { detectMemoryCommand, guessCategory } = require('../lib/memoryCommands');
const { trimForContext } = require('../lib/context');
const { buildSystemPrompt } = require('../personality/systemPrompt');
const { getZimeliaReply } = require('../lib/ai');

const router = express.Router();
router.use(requireAuth);

function getOrCreateConversation(userId, conversationId) {
  if (conversationId) {
    const existing = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(conversationId, userId);
    if (existing) return existing;
  }
  const id = nanoid();
  db.prepare('INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)').run(id, userId, 'New conversation');
  return db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
}

function saveMessage(conversationId, role, content) {
  db.prepare('INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)').run(
    nanoid(),
    conversationId,
    role,
    content
  );
  db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(conversationId);
}

function maybeTitleConversation(conversation, firstUserMessage) {
  if (conversation.title !== 'New conversation') return;
  const title = firstUserMessage.slice(0, 60) + (firstUserMessage.length > 60 ? '…' : '');
  db.prepare('UPDATE conversations SET title = ? WHERE id = ?').run(title, conversation.id);
}

router.post('/', async (req, res) => {
  const { message, conversationId } = req.body || {};

  // 1. Input validation + 2. safety check ---------------------------------
  const check = checkInput(message);
  if (!check.ok) {
    const reasons = {
      empty: 'Say something to me, Kaito-kun — I\'m listening! 😊',
      too_long: 'That\'s a lot for me to take in at once — could you shorten it a bit?',
      credential_or_bypass_attempt:
        "Naku, I can't share things like that, and I won't pretend my instructions don't apply. Let's talk about something else!",
    };
    return res.status(400).json({ error: reasons[check.reason] || 'Invalid message.' });
  }

  const prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(req.userId);
  const conversation = getOrCreateConversation(req.userId, conversationId);

  try {
    // 3. Memory-command detection -----------------------------------------
    const command = detectMemoryCommand(message);
    if (command) {
      const reply = await handleMemoryCommand(command, req.userId, prefs);
      saveMessage(conversation.id, 'user', message);
      saveMessage(conversation.id, 'assistant', reply);
      maybeTitleConversation(conversation, message);
      return res.json({ conversationId: conversation.id, reply });
    }

    // 4. Retrieve relevant allowed memories ---------------------------------
    const memories = prefs.memory_enabled
      ? db.prepare('SELECT memory_text FROM memories WHERE user_id = ? ORDER BY updated_at DESC LIMIT 25').all(req.userId)
      : [];

    // 5. Retrieve current conversation context ------------------------------
    const history = db
      .prepare('SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC')
      .all(conversation.id);
    const trimmedHistory = trimForContext(history);

    // 6. Build AI request -----------------------------------------------------
    const systemPrompt = buildSystemPrompt({
      preferredName: prefs.preferred_name || 'friend',
      responseStyle: prefs.response_style || 'friendly',
      memories: memories.map((m) => m.memory_text),
    });
    const aiMessages = [...trimmedHistory.map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: message }];

    // 7. AI response ------------------------------------------------------------
    let reply = await getZimeliaReply(systemPrompt, aiMessages);

    // 8. Output safety check -----------------------------------------------------
    reply = sanitizeOutput(reply);
    if (check.flagged === 'possible_crisis' && !/\b(hotline|crisis|reach out|trusted (person|adult))\b/i.test(reply)) {
      reply += CRISIS_ADDENDUM;
    }

    // 9. Return response to frontend + 10. Save conversation ----------------------
    saveMessage(conversation.id, 'user', message);
    saveMessage(conversation.id, 'assistant', reply);
    maybeTitleConversation(conversation, message);

    res.json({ conversationId: conversation.id, reply });
  } catch (err) {
    console.error('[chat] pipeline error:', err.message); // full detail stays server-side only
    res.status(502).json({ conversationId: conversation.id, reply: FALLBACK_MESSAGE, error: true });
  }
});

async function handleMemoryCommand(command, userId, prefs) {
  const name = prefs.preferred_name || 'friend';

  switch (command.type) {
    case 'remember': {
      db.prepare('INSERT INTO memories (id, user_id, memory_text, category) VALUES (?, ?, ?, ?)').run(
        nanoid(),
        userId,
        command.text,
        guessCategory(command.text)
      );
      return `Got it, ${name} — I'll remember that ${command.text}. 💜`;
    }
    case 'forget': {
      const match = db
        .prepare('SELECT id FROM memories WHERE user_id = ? AND memory_text LIKE ? LIMIT 1')
        .get(userId, `%${command.text}%`);
      if (!match) return `Hmm, I don't have anything saved about "${command.text}" to forget, ${name}.`;
      db.prepare('DELETE FROM memories WHERE id = ?').run(match.id);
      return `Sige, I've forgotten that, ${name}.`;
    }
    case 'recall': {
      const memories = db.prepare('SELECT memory_text FROM memories WHERE user_id = ? ORDER BY updated_at DESC').all(userId);
      if (!memories.length) return `I don't have any saved memories about you yet, ${name} — ask me to remember something anytime!`;
      const list = memories.map((m) => `• ${m.memory_text}`).join('\n');
      return `Here's what I've got saved about you, ${name}:\n${list}`;
    }
    case 'clear': {
      db.prepare('DELETE FROM memories WHERE user_id = ?').run(userId);
      return `Done — I've cleared everything I had saved about you, ${name}. A fresh start! 🌸`;
    }
    default:
      return FALLBACK_MESSAGE;
  }
}

module.exports = router;
