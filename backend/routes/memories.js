const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../db/database');
const { requireAuth } = require('../lib/auth');
const { guessCategory } = require('../lib/memoryCommands');

const router = express.Router();
router.use(requireAuth);

// GET /api/memories — list this user's memories
router.get('/', (req, res) => {
  const memories = db
    .prepare('SELECT * FROM memories WHERE user_id = ? ORDER BY updated_at DESC')
    .all(req.userId);
  res.json(memories);
});

// POST /api/memories — save a new memory explicitly
router.post('/', (req, res) => {
  const { memoryText, category } = req.body || {};
  if (!memoryText || !memoryText.trim()) {
    return res.status(400).json({ error: 'memoryText is required.' });
  }

  const id = nanoid();
  const cat = category || guessCategory(memoryText);
  db.prepare('INSERT INTO memories (id, user_id, memory_text, category) VALUES (?, ?, ?, ?)').run(
    id,
    req.userId,
    memoryText.trim(),
    cat
  );
  res.status(201).json({ id, memoryText: memoryText.trim(), category: cat });
});

// PUT /api/memories/:id — edit a memory (ownership enforced)
router.put('/:id', (req, res) => {
  const { memoryText, category } = req.body || {};
  const existing = db.prepare('SELECT * FROM memories WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Memory not found.' });

  db.prepare(
    "UPDATE memories SET memory_text = COALESCE(?, memory_text), category = COALESCE(?, category), updated_at = datetime('now') WHERE id = ?"
  ).run(memoryText ?? null, category ?? null, req.params.id);

  res.json(db.prepare('SELECT * FROM memories WHERE id = ?').get(req.params.id));
});

// DELETE /api/memories/:id — delete one memory (ownership enforced)
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM memories WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Memory not found.' });
  res.json({ ok: true });
});

// DELETE /api/memories — clear ALL of this user's memories
router.delete('/', (req, res) => {
  db.prepare('DELETE FROM memories WHERE user_id = ?').run(req.userId);
  res.json({ ok: true });
});

module.exports = router;
