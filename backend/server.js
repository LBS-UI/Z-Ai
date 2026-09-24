// ═══════════════════════════════════════════════════════════════════
// server.js — Zimelia's brain. Wires together middleware, routes,
// and the database. Boot with `npm start` (see README).
// ═══════════════════════════════════════════════════════════════════

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

require('./db/database'); // side effect: opens DB + applies schema

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const conversationRoutes = require('./routes/conversations');
const memoryRoutes = require('./routes/memories');
const preferenceRoutes = require('./routes/preferences');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').split(','),
    credentials: true,
  })
);
app.use(express.json({ limit: '200kb' }));
app.use(cookieParser());

// Chat is the expensive/abusable route — rate limit it a bit tighter.
const chatLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const generalLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'zimelia-backend' }));

app.use('/api/auth', generalLimiter, authRoutes);
app.use('/api/chat', chatLimiter, chatRoutes);
app.use('/api/conversations', generalLimiter, conversationRoutes);
app.use('/api/memories', generalLimiter, memoryRoutes);
app.use('/api/preferences', generalLimiter, preferenceRoutes);

// Never leak stack traces / internals to the client.
app.use((err, req, res, next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Something went wrong on my end. Please try again in a moment.' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✨ Zimelia's brain is online — listening on http://localhost:${PORT}`);
});
