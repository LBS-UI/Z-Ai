/**
 * Coding knowledge retrieval.
 * Lightweight text matching. Replaceable later with semantic search.
 */

import { listRecords } from "./coding-memory-store.js";

function score(record, query) {
  const q = String(query || "").toLowerCase();
  let s = 0;
  if (record.title && q.includes(record.title.toLowerCase())) s += 5;
  if (record.topic && q.includes(record.topic.toLowerCase())) s += 3;
  for (const tag of record.tags || []) {
    if (q.includes(tag)) s += 2;
  }
  const words = q.split(/\s+/).filter(w => w.length > 2);
  for (const w of words) {
    if ((record.content || "").toLowerCase().includes(w)) s += 1;
    if ((record.example || "").toLowerCase().includes(w)) s += 1;
  }
  if (record.type === "coding_preference" || record.type === "project_convention") s += 1;
  return s;
}

/**
 * @param {string} query
 * @param {Object} [opts] { language, limit }
 * @returns {Promise<Array>}
 */
export async function searchKnowledge(query, opts = {}) {
  const limit = opts.limit || 5;
  const all = await listRecords({ status: "approved", language: opts.language });
  return all
    .map(r => ({ record: r, score: score(r, query) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.record);
}

export async function preferencesFor(language) {
  const all = await listRecords({ status: "approved", language });
  return all.filter(r => r.type === "coding_preference" || r.type === "project_convention");
}
