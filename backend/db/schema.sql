-- ═══════════════════════════════════════════════════════════════════
-- Zimelia AI — persistent data schema
-- This is Zimelia's "memory" layer. It is intentionally independent
-- of the frontend so the site can be redesigned without losing data.
-- ═══════════════════════════════════════════════════════════════════

PRAGMA foreign_keys = ON;

-- Every person who talks to Zimelia. Minimal by design — no email,
-- no personal info beyond a display name, unless the user adds it
-- themselves via preferences.
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  display_name  TEXT NOT NULL DEFAULT 'Friend',
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Soft, low-stakes settings. One row per user.
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id          TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_name   TEXT,
  language         TEXT NOT NULL DEFAULT 'English',
  response_style   TEXT NOT NULL DEFAULT 'friendly',
  memory_enabled   INTEGER NOT NULL DEFAULT 1, -- 0/1 — user can turn memory off entirely
  theme            TEXT NOT NULL DEFAULT 'dusk',
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- A conversation thread.
CREATE TABLE IF NOT EXISTS conversations (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'New conversation',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);

-- Individual chat turns. Temporary/append-only record of what was said —
-- distinct from `memories`, which is deliberately curated.
CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  timestamp       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, timestamp);

-- Deliberate, permanent memory. Only written when the user explicitly
-- asks Zimelia to remember something, or via the memory UI directly.
CREATE TABLE IF NOT EXISTS memories (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  memory_text  TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'general',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id);

-- Server-side session tokens (simple cookie-session auth, no external deps).
CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL
);
