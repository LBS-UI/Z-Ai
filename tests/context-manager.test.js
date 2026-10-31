/**
 * Practical tests for the Conversation Manager.
 * Run with: node tests/context-manager.test.js
 * (Node 18+ with native ESM, or rename to .mjs)
 */

import { ConversationManager } from "../src/context-manager.js";
import { ZimeliaAI } from "../src/zimelia-ai.js";

function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("PASS:", msg);
}

async function run() {
  console.log("\n=== Conversation Manager Tests ===\n");

  // 1. Topic continuity
  {
    const cm = new ConversationManager();
    cm.addMessage("user", "How do I grow tomatoes?");
    cm.addMessage("assistant", "Start with good soil and sunlight.");
    cm.addMessage("user", "Why?");
    const ctx = cm.getContext();
    assert(ctx.currentTopic && /tomato/i.test(ctx.currentTopic), "Topic continuity: tomatoes stays current");
    assert(ctx.intent === "follow_up", "Follow-up 'Why?' is classified as follow_up");
    assert(ctx.referencedMessageId, "Follow-up links to previous assistant message");
  }

  // 2. Follow-up questions
  {
    const cm = new ConversationManager();
    cm.addMessage("user", "Give me two ideas");
    cm.addMessage("assistant", "1. Write a short story. 2. Sketch a character.");
    cm.addMessage("user", "What about the second one?");
    const ctx = cm.getContext();
    assert(ctx.intent === "follow_up", "Second-one reference is follow_up");
    assert(!ctx.needsClarification, "Second-one resolves when list exists");
  }

  // 3. Topic change
  {
    const cm = new ConversationManager();
    cm.addMessage("user", "How do I grow tomatoes?");
    const t1 = cm.getContext().currentTopic;
    cm.addMessage("user", "What is a black hole?");
    const t2 = cm.getContext().currentTopic;
    assert(t1 !== t2, "Topic changes when subject changes");
    assert(/black hole/i.test(t2), "New topic is black hole");
  }

  // 4. Ambiguous references
  {
    const cm = new ConversationManager();
    cm.addMessage("user", "What about the second one?");
    const ctx = cm.getContext();
    assert(ctx.needsClarification, "Ambiguous 'second one' asks for clarification");
  }

  // 5. Missing context
  {
    const ai = new ZimeliaAI();
    const result = await ai.handleMessage("Why?");
    assert(result.source === "clarification", "Missing context produces clarification");
    assert(/why what|don't have earlier/i.test(result.message), "Clarification message is sensible");
  }

  // 6. Empty input and consecutive duplicates
  {
    const ai = new ZimeliaAI();
    const empty = await ai.handleMessage("   ");
    assert(empty.source === "empty", "Empty input is ignored");
    const cm = ai.conversation;
    cm.addMessage("user", "Hello");
    const dup = cm.addMessage("user", "Hello");
    assert(dup === null, "Exact consecutive duplicate user message is ignored");
  }

  // 7. Session reset
  {
    const cm = new ConversationManager();
    cm.addMessage("user", "Remember this topic about cats");
    cm.resetSession();
    assert(cm.getLength() === 0, "Reset clears history");
    assert(cm.getContext().currentTopic === null, "Reset clears topic");
  }

  // 8. History limit
  {
    const cm = new ConversationManager({ maxHistory: 4 });
    for (let i = 0; i < 10; i++) cm.addMessage("user", "msg " + i);
    assert(cm.getLength() === 4, "History is limited to maxHistory");
  }

  console.log("\nAll tests passed.\n");
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
