/**
 * Coding memory store.
 * IndexedDB in the browser. In-memory fallback when IndexedDB is unavailable (tests, restricted pages).
 */

import { createKnowledgeRecord, validateKnowledge, isDuplicate } from "./coding-memory-schema.js";

const DB_NAME = "zimelia_coding";
const STORE = "knowledge";
const VERSION = 1;

let memoryFallback = [];
let useFallback = typeof indexedDB === "undefined";

function openDB() {
  if (useFallback || typeof indexedDB === "undefined") {
    useFallback = true;
    return Promise.resolve(null);
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: "id" });
        os.createIndex("language", "language", { unique: false });
        os.createIndex("status", "status", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      useFallback = true;
      resolve(null);
    };
  });
}

export async function initStore() {
  await openDB();
  return { fallback: useFallback };
}

export async function saveRecord(partial) {
  const record = createKnowledgeRecord(partial);
  const check = validateKnowledge(record);
  if (!check.ok) return { ok: false, errors: check.errors, record: null };

  const existing = await listRecords();
  if (existing.some(e => isDuplicate(e, record) && e.id !== record.id)) {
    return { ok: false, errors: ["Duplicate"], record, duplicate: true };
  }

  if (useFallback) {
    memoryFallback = memoryFallback.filter(e => e.id !== record.id);
    memoryFallback.push(record);
    return { ok: true, record };
  }
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve({ ok: true, record });
    tx.onerror = () => resolve({ ok: false, errors: ["DB write failed"], record: null });
  });
}

export async function listRecords(filter = {}) {
  if (useFallback) {
    return memoryFallback.filter(r => {
      if (filter.status && r.status !== filter.status) return false;
      if (filter.language && r.language !== filter.language) return false;
      return true;
    });
  }
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const all = req.result || [];
      resolve(all.filter(r => {
        if (filter.status && r.status !== filter.status) return false;
        if (filter.language && r.language !== filter.language) return false;
        return true;
      }));
    };
    req.onerror = () => resolve([]);
  });
}

export async function deleteRecord(id) {
  if (useFallback) {
    memoryFallback = memoryFallback.filter(r => r.id !== id);
    return { ok: true };
  }
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve({ ok: true });
    tx.onerror = () => resolve({ ok: false });
  });
}

export async function clearAll() {
  if (useFallback) { memoryFallback = []; return { ok: true }; }
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve({ ok: true });
    tx.onerror = () => resolve({ ok: false });
  });
}

export function exportJSON() {
  return listRecords().then(records => JSON.stringify({ version: 1, records }, null, 2));
}

export async function importJSON(json, mode = "merge") {
  let data;
  try { data = typeof json === "string" ? JSON.parse(json) : json; }
  catch (e) { return { ok: false, errors: ["Invalid JSON"] }; }
  const records = Array.isArray(data.records) ? data.records : [];
  const results = [];
  if (mode === "replace") await clearAll();
  for (const r of records) {
    const check = validateKnowledge(createKnowledgeRecord(r));
    if (!check.ok) { results.push({ ok: false, errors: check.errors }); continue; }
    results.push(await saveRecord(r));
  }
  return { ok: true, results };
}

export function _resetFallback() {
  memoryFallback = [];
  useFallback = true;
}
