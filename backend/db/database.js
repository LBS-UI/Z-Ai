// ═══════════════════════════════════════════════════════════════════
// database.js — single point of contact with SQLite.
// Everything else in the backend goes through here so the storage
// engine could be swapped later without touching route logic.
// ═══════════════════════════════════════════════════════════════════

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dbPath = path.resolve(__dirname, '..', process.env.DATABASE_URL || './data/zimelia.db');

// Make sure the data/ folder exists before SQLite tries to create the file.
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Apply schema.sql on every boot. Every statement uses IF NOT EXISTS,
// so this is a safe, idempotent "migration" — re-running it never
// destroys existing data.
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

module.exports = db;
