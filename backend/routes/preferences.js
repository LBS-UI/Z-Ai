const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../lib/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(req.userId);
  res.json(prefs);
});

router.put('/', (req, res) => {
  const { preferredName, language, responseStyle, memoryEnabled, theme } = req.body || {};
  db.prepare(
    `UPDATE user_preferences SET
       preferred_name = COALESCE(?, preferred_name),
       language = COALESCE(?, language),
       response_style = COALESCE(?, response_style),
       memory_enabled = COALESCE(?, memory_enabled),
       theme = COALESCE(?, theme),
       updated_at = datetime('now')
     WHERE user_id = ?`
  ).run(
    preferredName ?? null,
    language ?? null,
    responseStyle ?? null,
    memoryEnabled === undefined ? null : memoryEnabled ? 1 : 0,
    theme ?? null,
    req.userId
  );
  res.json(db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(req.userId));
});

module.exports = router;
