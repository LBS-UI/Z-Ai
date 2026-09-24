const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../db/database');
const { hashPassword, verifyPassword, createSession, destroySession, requireAuth, SESSION_COOKIE } = require('../lib/auth');

const router = express.Router();

const cookieOpts = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.COOKIE_SECURE === 'true',
  maxAge: 30 * 24 * 60 * 60 * 1000,
});

router.post('/signup', (req, res) => {
  const { displayName, password } = req.body || {};
  if (!displayName || !password || password.length < 8) {
    return res.status(400).json({ error: 'A display name and an 8+ character password are required.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE display_name = ?').get(displayName);
  if (existing) return res.status(409).json({ error: 'That display name is already taken.' });

  const id = nanoid();
  db.prepare('INSERT INTO users (id, display_name, password_hash) VALUES (?, ?, ?)').run(id, displayName, hashPassword(password));
  db.prepare('INSERT INTO user_preferences (user_id, preferred_name) VALUES (?, ?)').run(id, displayName);

  const { token } = createSession(id);
  res.cookie(SESSION_COOKIE, token, cookieOpts());
  res.status(201).json({ id, displayName });
});

router.post('/login', (req, res) => {
  const { displayName, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE display_name = ?').get(displayName || '');
  if (!user || !verifyPassword(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Incorrect display name or password.' });
  }

  const { token } = createSession(user.id);
  res.cookie(SESSION_COOKIE, token, cookieOpts());
  res.json({ id: user.id, displayName: user.display_name });
});

router.post('/logout', (req, res) => {
  const token = req.cookies ? req.cookies[SESSION_COOKIE] : null;
  if (token) destroySession(token);
  res.clearCookie(SESSION_COOKIE);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, display_name, created_at FROM users WHERE id = ?').get(req.userId);
  res.json(user);
});

module.exports = router;
