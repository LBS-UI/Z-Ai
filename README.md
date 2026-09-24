# Zimelia AI

Zimelia is an AI wellness companion with a warm Japanese-Filipino personality.
This project is split into three independent pieces so any one of them can be
rebuilt without losing the others:

```
ZIMELIA
│
├── frontend/   "body"   — the website, chat UI, memory panel
├── backend/    "brain"  — API, AI pipeline, safety filtering
└── backend/data/ "memory" — SQLite database (conversations + memories)
```

**The frontend can be redesigned or replaced entirely and Zimelia's memories
survive**, because they live in the backend's database, not in any frontend
file.

---

## 1. Project structure

```
zimelia-ai/
├── backend/
│   ├── server.js              Express app entry point
│   ├── db/
│   │   ├── schema.sql         Table definitions (idempotent)
│   │   └── database.js        Opens SQLite + applies schema on boot
│   ├── routes/
│   │   ├── auth.js            /api/auth — signup, login, logout, me
│   │   ├── chat.js            /api/chat — the full chat pipeline
│   │   ├── conversations.js   /api/conversations
│   │   ├── memories.js        /api/memories
│   │   └── preferences.js     /api/preferences
│   ├── lib/
│   │   ├── ai.js              Talks to the Anthropic API (only file that does)
│   │   ├── auth.js            Password hashing + session cookies
│   │   ├── context.js         Trims conversation history sent to the AI
│   │   ├── memoryCommands.js  Detects "remember that…" style commands
│   │   └── safety.js          Input/output safety checks
│   ├── personality/
│   │   └── systemPrompt.js    Zimelia's character, kept separate from code
│   ├── data/                  SQLite database file lives here (gitignored)
│   └── .env.example           Copy to .env and fill in
│
├── frontend/
│   ├── index.html             Landing page, chat, memory panel, auth modal
│   ├── server.js              Zero-dependency static file server
│   ├── css/style.css          All styling — glassmorphism / purple-green-amber theme
│   ├── js/
│   │   ├── config.js          Backend URL — the one line to edit when deploying
│   │   ├── api.js             fetch() wrapper for the backend API
│   │   ├── auth.js            Sign-in/sign-up modal logic
│   │   ├── chat.js            Chat UI, message rendering, conversation list
│   │   ├── memory.js          Memory panel: view/edit/delete/clear
│   │   └── app.js             Ambient particles + wiring auth state to the UI
│   └── assets/
│       └── zimelia-avatar.svg Zimelia's PFP (a single reusable SVG)
│
└── README.md                  You are here
```

---

## 2. Required software

- **Node.js 18+** (uses native `fetch`, so 18+ is required — you're on Node 22, which is fine)
- npm (comes with Node)

No external database server is required — SQLite is a single file, created
automatically on first run.

---

## 3. Installation

```bash
# from the project root
cd backend && npm install
cd ../frontend && npm install   # no real dependencies, but sets things up consistently
```

---

## 4. Environment variables

Copy the example file and fill it in:

```bash
cd backend
cp .env.example .env
```

| Variable          | What it's for                                                                 |
|-------------------|--------------------------------------------------------------------------------|
| `PORT`            | Port the backend listens on (default `3001`)                                   |
| `FRONTEND_ORIGIN` | The frontend's URL, for CORS (default `http://localhost:5173`)                 |
| `DATABASE_URL`    | Path to the SQLite file, relative to `backend/` (default `./data/zimelia.db`)  |
| `AI_API_KEY`      | Your Anthropic API key — get one at console.anthropic.com                      |
| `AI_MODEL`        | Which model Zimelia talks to (default `claude-sonnet-4-5`)                     |
| `SESSION_SECRET`  | Not currently used for signing (sessions are opaque random tokens stored server-side), kept for future use — set it anyway |
| `COOKIE_SECURE`   | Set to `true` once you're serving over HTTPS in production                     |

**Never commit your real `.env` file.** It's already in `.gitignore`.

---

## 5. Database

The schema lives in `backend/db/schema.sql` and is applied automatically every
time the backend starts (`backend/db/database.js` runs it on boot). Every
statement uses `IF NOT EXISTS`, so restarting the server never destroys data —
this doubles as your "migration" system for now. If you need to add a column
later, add an `ALTER TABLE ... ADD COLUMN` guarded with a check, or move to a
proper migration tool (e.g. `node-sqlite-migrate`) once the schema is more
established.

**Tables:** `users`, `user_preferences`, `conversations`, `messages`,
`memories`, `sessions`. See `schema.sql` for full column definitions.

---

## 6. How to start the backend

```bash
cd backend
npm start
# ✨ Zimelia's brain is online — listening on http://localhost:3001
```

Use `npm run dev` instead to auto-restart on file changes.

Check it's alive:

```bash
curl http://localhost:3001/api/health
```

---

## 7. How to start the frontend

```bash
cd frontend
npm start
# 🌸 Zimelia's frontend is online — http://localhost:5173
```

Then open **http://localhost:5173** in your browser. If you're using VS
Code's Live Server extension instead (as with the Multimedia Club site), that
works too — just make sure the port matches `FRONTEND_ORIGIN` in the
backend's `.env`, or update `frontend/js/config.js` to point at wherever the
backend is running.

---

## 8. How the frontend talks to the backend

`frontend/js/config.js` sets `window.ZIMELIA_API_BASE`, which every call in
`frontend/js/api.js` uses. That's the **only** place a deployed frontend needs
to be told where the backend lives:

```js
window.ZIMELIA_API_BASE = 'https://your-backend.example.com/api';
```

Authentication is a signed, httpOnly session cookie — the browser handles it
automatically once you're signed in (`credentials: 'include'` on every
request). No API keys ever touch the frontend.

---

## 9. Chat API

```
POST   /api/chat                    { message, conversationId? } → { conversationId, reply }

GET    /api/conversations
GET    /api/conversations/:id
DELETE /api/conversations/:id

GET    /api/memories
POST   /api/memories                { memoryText, category? }
PUT    /api/memories/:id            { memoryText?, category? }
DELETE /api/memories/:id
DELETE /api/memories                clears all of the signed-in user's memories

GET    /api/preferences
PUT    /api/preferences             { preferredName?, language?, responseStyle?, memoryEnabled?, theme? }

POST   /api/auth/signup             { displayName, password }
POST   /api/auth/login              { displayName, password }
POST   /api/auth/logout
GET    /api/auth/me
```

All routes except `/api/auth/*` and `/api/health` require a signed-in session
and only ever touch the signed-in user's own rows — every query is scoped by
`user_id`, enforced at the SQL level, not just in the UI.

---

## 10. How memory works

Zimelia has **two separate kinds of "remembering"**, and they're never mixed:

1. **Conversation history** (`messages` table) — a plain record of what was
   said in a given conversation, used to give the AI short-term context. It
   is trimmed (see `backend/lib/context.js`) before being sent to the model
   so conversations don't grow unbounded.
2. **Memory** (`memories` table) — permanent, and only ever written when:
   - the user says something like *"remember that I like purple"* in chat
     (parsed by `backend/lib/memoryCommands.js`), or
   - the user adds/edits it directly from the memory panel in the UI.

Nothing is auto-summarized from a conversation into a permanent memory.
Users can turn off memory retrieval entirely (`memory_enabled` in
preferences) without deleting what's saved, or wipe everything with **Clear
all memories**.

Supported natural-language commands in chat:
- `remember that I like purple`
- `forget that I like purple`
- `what do you remember about me?`
- `clear my memories`

---

## 11. How to back up Zimelia's data

The entire database is one file: `backend/data/zimelia.db` (plus its
`-wal`/`-shm` sidecar files while the server is running). To back up:

```bash
# safest: stop the backend first, or use SQLite's own backup command
sqlite3 backend/data/zimelia.db ".backup 'backup-$(date +%F).db'"
```

To restore, stop the backend, replace `backend/data/zimelia.db` with your
backup, and restart.

### Migrating to a new frontend later

Because the backend and database are fully independent of the frontend:

```
Frontend destroyed
      ↓
backend/data/zimelia.db still has every user, conversation, and memory
      ↓
Point a new frontend at the same backend (edit config.js)
      ↓
Zimelia's memories survive
```

### Exporting data

There's no dedicated export endpoint yet (see limitations below), but since
everything is plain SQLite, you can export any table to JSON/CSV directly:

```bash
sqlite3 backend/data/zimelia.db -json "SELECT * FROM memories WHERE user_id = '...';" > memories.json
```

---

## 12. Testing it end-to-end

With both servers running:

```bash
# create an account
curl -c cookies.txt -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Kaito","password":"a-strong-password"}'

# save a memory via chat
curl -b cookies.txt -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Remember that I like purple."}'

# ask for it back
curl -b cookies.txt -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What do you remember about me?"}'
```

Or just open the site and use the UI — sign up, chat, open the 🧠 Memories
panel.

---

## 13. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Frontend shows "trouble connecting" on every message | `AI_API_KEY` missing/invalid in `backend/.env`, or backend isn't running |
| `CORS` errors in the browser console | `FRONTEND_ORIGIN` in `backend/.env` doesn't match the URL you're actually loading the frontend from |
| "Not signed in" on every request | Cookies blocked (e.g. testing across two different `localhost` ports in a browser with strict cookie settings) — this works fine in normal browser use, but curl needs `-b`/`-c` flags as shown above |
| Database seems empty after restart | Check `DATABASE_URL` — if it's a relative path, it's resolved relative to `backend/`, not wherever you ran the command from |

---

## 14. Known limitations / what's next

- No dedicated "export my data" or "delete my account" endpoint yet — data
  deletion currently means deleting memories/conversations individually, or
  wiping the SQLite file directly. Worth adding a proper `DELETE /api/account`
  route that cascades through all tables.
- `SESSION_SECRET` is defined in `.env` but not yet used — sessions are opaque
  random tokens looked up in the `sessions` table rather than signed JWTs.
  Fine for now; worth revisiting if you outgrow a single SQLite file.
- Conversation "summarization" for long chats is just truncation (oldest
  messages dropped) rather than true rolling summarization — good enough to
  start, but a real summarizer would preserve more context in long-running
  conversations.
- No password reset flow yet.
- Rate limiting is in-memory (`express-rate-limit` defaults) — fine for a
  single server, but won't share state across multiple backend instances if
  you ever scale horizontally. Swap in a Redis-backed store if you do.
