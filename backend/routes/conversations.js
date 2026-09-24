const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../lib/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/conversations — list this user's conversations (no message bodies, keeps it light)
router.get('/', (req, res) => {
  const conversations = db
    .prepare('SELECT id, title, created_at, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC')
    .all(req.userId);
  res.json(conversations);
});

// GET /api/conversations/:id — full conversation with messages (ownership enforced)
router.get('/:id', (req, res) => {
  const conversation = db
    .prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });

  const messages = db
    .prepare('SELECT id, role, content, timestamp FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC')
    .all(req.params.id);

  res.json({ ...conversation, messages });
});

// DELETE /api/conversations/:id — ownership enforced
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Conversation not found.' });
  res.json({ ok: true });
});

module.exports = router;
