// ═══════════════════════════════════════════════════════════════════
// auth.js — minimal session auth with no external auth service.
// A session token is issued on signup/login, stored in an httpOnly
// cookie, and looked up against the `sessions` table on every
// request. This is what makes "a user can't read another user's
// memories" actually enforceable.
// ═══════════════════════════════════════════════════════════════════

const crypto = require('crypto');
const db = require('../db/database');

const SESSION_COOKIE = 'zimelia_session';
const SESSION_DAYS = 30;

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const attempt = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(attempt));
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expires);
  return { token, expires };
}

function destroySession(token) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

/** Express middleware: attaches req.userId or responds 401. */
function requireAuth(req, res, next) {
  const token = req.cookies ? req.cookies[SESSION_COOKIE] : null;
  if (!token) return res.status(401).json({ error: 'Not signed in.' });

  const session = db
    .prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > datetime(\'now\')')
    .get(token);

  if (!session) return res.status(401).json({ error: 'Session expired. Please sign in again.' });

  req.userId = session.user_id;
  next();
}

module.exports = { hashPassword, verifyPassword, createSession, destroySession, requireAuth, SESSION_COOKIE };
