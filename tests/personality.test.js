/**
 * Personality system tests.
 * Run: node tests/personality.test.js
 */

import { PersonalitySystem } from "../src/zimelia-personality.js";
import { ZimeliaAI } from "../src/zimelia-ai.js";

function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("PASS:", msg);
}

async function run() {
  console.log("\n=== Personality System Tests ===\n");

  // 1. Casual greeting
  {
    const ai = new ZimeliaAI();
    const r = await ai.handleMessage("Hi");
    assert(r.source === "personality", "Greeting uses personality source");
    assert(r.message && r.message.length > 0, "Greeting returns a message");
    assert(!/i feel|i remember when i/i.test(r.message), "Does not claim personal feelings");
  }

  // 2. Serious message should not get a joke
  {
    const p = new PersonalitySystem();
    const ctx = { intent: "venting", currentTopic: null };
    const r = p.respond("I'm really sad and overwhelmed", ctx);
    assert(r.tone === "serious" || r.strategy === "emotional_support", "Serious input gets serious/caring tone");
    assert(!/lol|haha|joke/i.test(r.text), "No joke in serious reply");
  }

  // 3. Advice request
  {
    const ai = new ZimeliaAI();
    const r = await ai.handleMessage("Should I take the job or stay?");
    assert(r.intent === "advice_seeking" || /decid|advice|think/i.test(r.message), "Advice request gets advice-oriented reply");
  }

  // 4. Ambiguous / unclear
  {
    const ai = new ZimeliaAI();
    const r = await ai.handleMessage("?");
    assert(r.intent === "unclear" || /sure|mean|more|rephrase/i.test(r.message), "Unclear input asks for clarification or admits uncertainty");
  }

  // 5. Repeated prompts rotate templates
  {
    const p = new PersonalitySystem();
    const ctx = { intent: "greeting", currentTopic: null };
    const replies = new Set();
    for (let i = 0; i < 6; i++) {
      replies.add(p.respond("hi", ctx).text);
    }
    assert(replies.size >= 2, "Repeated greetings rotate alternatives");
  }

  // 6. Context-dependent follow-up
  {
    const ai = new ZimeliaAI();
    await ai.handleMessage("How do I grow tomatoes?");
    const r = await ai.handleMessage("Why?");
    assert(r.intent === "follow_up" || /tomato|part|before/i.test(r.message), "Follow-up stays on topic");
  }

  // 7. Emotion signal is ignored when uncertain
  {
    const p = new PersonalitySystem();
    const ctx = { intent: "statement", currentTopic: null };
    const r = p.respond("okay", ctx, { label: "sad", confidence: 0.2, uncertain: true });
    assert(r.tone !== "serious", "Uncertain emotion signal is not trusted");
  }

  // 8. Config is customizable
  {
    const p = new PersonalitySystem({ config: { communicationStyle: { playfulness: 0.9 } } });
    assert(p.getConfig().communicationStyle.playfulness === 0.9, "Personality config is overridable");
  }

  console.log("\nAll personality tests passed.\n");
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
