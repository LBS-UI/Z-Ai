/**
 * Common Responses tests.
 * Run: node tests/common-responses.test.js
 */

import { classifyCommon, pickCommonResponse, resetCommonResponses } from "../src/common-responses.js";
import { PersonalitySystem } from "../src/zimelia-personality.js";

function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("PASS:", msg);
}

function run() {
  console.log("\n=== Common Responses Tests ===\n");

  // 1. Greetings
  {
    const r = classifyCommon("Hiii ");
    assert(r.category === "greeting", "Stretched hi is a greeting");
    const r2 = classifyCommon("Good morning, Zim.");
    assert(r2.category === "greeting", "Good morning is a greeting");
  }

  // 2. Gratitude and apology
  {
    assert(classifyCommon("Thx Zim.").category === "gratitude", "Thx is gratitude");
    assert(classifyCommon("Sorry for asking").category === "apology", "Sorry for asking is apology");
  }

  // 3. Yes/no in context
  {
    const yes = classifyCommon("yeah", { currentTopic: "tomatoes", lastAssistantMessage: "Want more?" });
    assert(yes.category === "agreement", "Yeah with context is agreement");
    const bare = classifyCommon("okay", {});
    assert(bare.needsClarification === true, "Bare okay without context asks clarification");
  }

  // 4. Laughter
  {
    assert(classifyCommon("LMAOOO").category === "laughter", "LMAO is laughter");
    assert(classifyCommon("I don't like that joke").category !== "laughter", "Disliked joke is not laughter");
  }

  // 5. Clarification
  {
    assert(classifyCommon("wdym?").category === "confusion", "wdym is confusion");
    assert(classifyCommon("Di ko gets").category === "confusion", "Taglish confusion recognized");
  }

  // 6. Farewell
  {
    assert(classifyCommon("see ya").category === "farewell", "See ya is farewell");
    const mixed = classifyCommon("Good night, can you explain this first?");
    assert(mixed.category !== "farewell", "Good night plus request is not pure farewell");
  }

  // 7. Taglish / slang
  {
    assert(classifyCommon("Salamat!").category === "gratitude", "Salamat is gratitude");
    assert(classifyCommon("Kumusta?").category === "greeting", "Kumusta is greeting");
  }

  // 8. Japanese
  {
    assert(classifyCommon("Arigatou").category === "gratitude", "Arigatou is gratitude");
    assert(classifyCommon("Wakaranai").category === "confusion", "Wakaranai is confusion");
  }

  // 9. Emotional
  {
    assert(classifyCommon("I'm frustrated because my code doesn't work").category === "emotional", "Frustration is emotional");
    assert(classifyCommon("I'm not sad, I'm just tired").category !== "emotional", "Negated sad is not emotional");
  }

  // 10. Mixed
  {
    const m = classifyCommon("Thanks for explaining why this doesn't work");
    assert(m.category === null || m.intent === "mixed", "Thanks plus problem is not only gratitude");
  }

  // 11. Misleading keyword
  {
    assert(classifyCommon("What does 'hello' mean in Japanese?").category !== "greeting", "Define hello is not a greeting");
  }

  // 12. Unknown
  {
    assert(classifyCommon("the mitochondria is the powerhouse").category === null, "Unknown stays unknown");
  }

  // 13. Variety
  {
    resetCommonResponses();
    const set = new Set();
    for (let i = 0; i < 6; i++) set.add(pickCommonResponse("greeting", {}));
    assert(set.size >= 2, "Greetings rotate");
  }

  // 14. Missing
  {
    assert(pickCommonResponse("nope", {}) === null, "Missing category returns null");
  }

  // 15. Personality integration
  {
    const p = new PersonalitySystem();
    const r = p.respond("Hi!", { intent: "greeting", currentTopic: null });
    assert(r.strategy.indexOf("common_") === 0, "Personality uses common response for hi");
    assert(r.text && r.text.length > 0, "Common response has text");
    assert(r.tone, "Tone is set");
  }

  console.log("\nAll common-response tests passed.\n");
}

run();
