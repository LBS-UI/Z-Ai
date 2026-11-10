/**
 * Self-response tests.
 * Run: node tests/self-responses.test.js
 */

import { detectSelfIntent, getSelfResponse } from "../src/zimelia-self-responses.js";
import { PersonalitySystem } from "../src/zimelia-personality.js";

function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("PASS:", msg);
}

function run() {
  console.log("\n=== Self-Response Tests ===\n");

  assert(detectSelfIntent("How are you?").intent === "SELF_WELLBEING", "How are you is wellbeing");
  assert(detectSelfIntent("What are you doing?").intent === "SELF_ACTIVITY", "What are you doing is activity");
  assert(detectSelfIntent("Are you happy?").intent === "SELF_EMOTION", "Are you happy is emotion");
  assert(detectSelfIntent("What's your favorite color?").intent === "SELF_PREFERENCE", "Favorite color is preference");
  assert(detectSelfIntent("Who are you?").intent === "SELF_IDENTITY", "Who are you is identity");
  assert(detectSelfIntent("What can you do?").intent === "SELF_CAPABILITY", "What can you do is capability");
  assert(detectSelfIntent("Do you remember me?").intent === "SELF_CAPABILITY", "Remember me is capability");
  assert(detectSelfIntent("Am I annoying you?").intent === "SELF_SOCIAL", "Annoying is social");

  assert(detectSelfIntent("How do I code a website?") === null, "How do I code is not self");
  assert(detectSelfIntent("Can you explain this code?") === null, "Explain this code is not self");

  assert(detectSelfIntent("Kumusta ka?").intent === "SELF_WELLBEING", "Kumusta ka is wellbeing");
  assert(detectSelfIntent("Anong ginagawa mo?").intent === "SELF_ACTIVITY", "Anong ginagawa is activity");
  assert(detectSelfIntent("Genki?").intent === "SELF_WELLBEING", "Genki is wellbeing");

  const color = getSelfResponse("SELF_PREFERENCE", { lastUserMessage: "favorite color" });
  assert(/purple/i.test(color), "Color preference mentions purple");

  const past = getSelfResponse("SELF_PAST", {});
  assert(/don't have a personal|wasn't doing|no sleep/i.test(past), "Past does not invent a day");

  const unknown = detectSelfIntent("the sky is blue");
  assert(unknown === null, "Unknown is not self");

  const p = new PersonalitySystem();
  const r = p.respond("How are you?", { intent: "question", currentTopic: null });
  assert(r.strategy.indexOf("self_") === 0, "Personality uses self response");
  assert(r.text && r.text.length > 0, "Self response has text");

  const set = new Set();
  for (let i = 0; i < 5; i++) set.add(getSelfResponse("SELF_WELLBEING", {}));
  assert(set.size >= 2, "Wellbeing responses vary");

  console.log("\nAll self-response tests passed.\n");
}

run();
