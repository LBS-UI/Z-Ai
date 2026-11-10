/**
 * Learning workflow. Proposals stay pending until approved.
 */

import { createKnowledgeRecord, validateKnowledge } from "./coding-memory-schema.js";
import { saveRecord, listRecords, deleteRecord } from "./coding-memory-store.js";

export function proposeFromMessage(text, language = "javascript") {
  const t = String(text || "").trim();
  if (!t) return { ok: false, errors: ["Empty"] };
  const title = t.slice(0, 60);
  const record = createKnowledgeRecord({
    type: /function |const |let |var |<|{|}/.test(t) ? "code_example" : "coding_concept",
    language,
    topic: language,
    title,
    content: t,
    example: /[{};]/.test(t) ? t : "",
    tags: [language, "user"],
    source: "user",
    status: "pending"
  });
  return { ok: true, record, validation: validateKnowledge(record) };
}

export async function approve(record) {
  record.status = "approved";
  record.updatedAt = new Date().toISOString();
  return saveRecord(record);
}

export async function reject(record) {
  record.status = "rejected";
  return saveRecord(record);
}

export async function pending() {
  return listRecords({ status: "pending" });
}

export async function approved(filter = {}) {
  return listRecords({ status: "approved", ...filter });
}

export { deleteRecord };
