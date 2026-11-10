/**
 * Coding memory schema and validation.
 * User-provided knowledge is labeled as such. Not verified facts.
 */

export const KNOWLEDGE_TYPES = [
  "coding_concept",
  "code_example",
  "coding_preference",
  "project_convention",
  "correction",
  "template_reference"
];

export const STATUSES = ["pending", "approved", "rejected"];

export function createKnowledgeRecord(partial = {}) {
  const now = new Date().toISOString();
  return {
    id: partial.id || ("k_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7)),
    type: partial.type || "coding_concept",
    language: String(partial.language || "javascript").toLowerCase(),
    topic: String(partial.topic || "").trim(),
    title: String(partial.title || "").trim(),
    content: String(partial.content || "").trim(),
    example: String(partial.example || "").trim(),
    tags: Array.isArray(partial.tags) ? partial.tags.map(t => String(t).toLowerCase()) : [],
    source: partial.source || "user",
    status: partial.status || "pending",
    createdAt: partial.createdAt || now,
    updatedAt: partial.updatedAt || now
  };
}

export function validateKnowledge(record) {
  const errors = [];
  if (!record || typeof record !== "object") return { ok: false, errors: ["Not an object"] };
  if (!KNOWLEDGE_TYPES.includes(record.type)) errors.push("Invalid type");
  if (!STATUSES.includes(record.status)) errors.push("Invalid status");
  if (!record.title) errors.push("Missing title");
  if (!record.content && !record.example) errors.push("Missing content or example");
  if (/api[_-]?key|password|secret|token/i.test(record.content + record.example)) {
    errors.push("Looks like a secret. Not stored.");
  }
  return { ok: errors.length === 0, errors };
}

export function isDuplicate(a, b) {
  if (!a || !b) return false;
  return a.language === b.language &&
    a.title.toLowerCase() === b.title.toLowerCase() &&
    a.type === b.type;
}
