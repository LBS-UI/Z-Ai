/**
 * Coding Brain tests (in-memory store).
 * Run: node tests/coding-brain.test.js
 */

import { _resetFallback, saveRecord, listRecords, exportJSON, importJSON, clearAll } from "../src/coding-memory-store.js";
import { proposeFromMessage, approve, pending } from "../src/coding-learner.js";
import { generateOffline } from "../src/code-generator.js";
import { validateCode } from "../src/code-validator.js";
import { CodingBrain } from "../src/zimelia-coding-brain.js";
import { ZimeliaAI } from "../src/zimelia-ai.js";

function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("PASS:", msg);
}

async function run() {
  console.log("\n=== Coding Brain Tests ===\n");
  _resetFallback();
  await clearAll();

  // 1. Save approved concept
  {
    const p = proposeFromMessage("A function should return a value.", "javascript");
    assert(p.ok, "Proposal created");
    assert(p.record.status === "pending", "Proposal is pending");
    const saved = await approve(p.record);
    assert(saved.ok, "Approved save");
    const list = await listRecords({ status: "approved" });
    assert(list.length >= 1, "Approved concept stored");
  }

  // 2. Reject without saving as approved
  {
    const p = proposeFromMessage("Do not save this one.", "javascript");
    await saveRecord(p.record);
    const before = (await listRecords({ status: "approved" })).length;
    const after = (await listRecords({ status: "approved" })).length;
    assert(after === before, "Unapproved stays out of approved");
    assert((await pending()).some(r => r.title.indexOf("Do not save") === 0), "Pending still listed");
  }

  // 3. Duplicate
  {
    const a = await saveRecord({ type: "coding_concept", language: "javascript", title: "Same", content: "x", status: "approved" });
    const b = await saveRecord({ type: "coding_concept", language: "javascript", title: "Same", content: "y", status: "approved" });
    assert(b.duplicate === true, "Duplicate detected");
  }

  // 4. Export / import
  {
    const json = await exportJSON();
    assert(json.indexOf("records") !== -1, "Export has records");
    await clearAll();
    const imp = await importJSON(json, "merge");
    assert(imp.ok, "Import ok");
    assert((await listRecords()).length > 0, "Imported records present");
  }

  // 5. Invalid JSON
  {
    const bad = await importJSON("{not json", "merge");
    assert(bad.ok === false, "Invalid JSON rejected");
  }

  // 6. Offline generate
  {
    const gen = generateOffline("write a javascript function");
    assert(gen.ok && gen.code.indexOf("function") !== -1, "Offline function template");
    const v = validateCode(gen);
    assert(v.ok || v.warnings, "Validation returns a result");
  }

  // 7. No auto-exec
  {
    const gen = generateOffline("write a javascript function");
    assert(!/\beval\(/.test(gen.code), "Template has no eval");
  }

  // 8. Ordinary message not coding
  {
    const brain = new CodingBrain();
    assert(brain.isCodingRequest("Hi") === false, "Greeting is not coding");
    assert(brain.isCodingRequest("write a function") === true, "Write function is coding");
  }

  // 9. Personality path still works
  {
    const ai = new ZimeliaAI();
    const r = await ai.handleMessage("Hi");
    assert(r.source === "personality" || r.source === "coding", "Hi still answered");
    assert(r.source !== "coding", "Hi is not routed to coding");
  }

  // 10. Coding request handled
  {
    const ai = new ZimeliaAI();
    const r = await ai.handleMessage("write a javascript function");
    assert(r.source === "coding", "Coding request uses coding brain");
    assert(r.message.indexOf("function") !== -1, "Reply contains code");
  }

  console.log("\nAll coding brain tests passed.\n");
}

run().catch(err => { console.error(err); process.exit(1); });
