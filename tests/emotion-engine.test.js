/**
 * Emotion engine tests.
 * Run: node tests/emotion-engine.test.js
 */

import { EmotionEngine } from "../src/emotion-engine.js";
import { ZimeliaAI } from "../src/zimelia-ai.js";

function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("PASS:", msg);
}

async function run() {
  console.log("\n=== Emotion Engine Tests ===\n");

  const engine = new EmotionEngine();

  // 1. Explicit emotions
  {
    const r = engine.analyze("I'm really happy today");
    assert(r.primary.label === "happiness", "Explicit happiness detected");
    assert(r.primary.confidence > 0.4, "Happiness has non-trivial heuristic score");
  }
  {
    const r = engine.analyze("I feel so sad and down");
    assert(r.signals.some(s => s.label === "sadness"), "Sadness signal present");
  }

  // 2. Negation
  {
    const r = engine.analyze("I'm not angry");
    assert(r.negated.includes("anger") || r.primary.label !== "anger", "Negation reduces or blocks anger");
  }

  // 3. Mixed / contrast
  {
    const r = engine.analyze("I thought I'd be happy, but I'm disappointed");
    assert(r.mixed || r.signals.length >= 1, "Contrast message produces signals");
    assert(r.uncertaintyReasons.some(x => /contrast/i.test(x)), "Contrast noted as uncertainty");
  }

  // 4. Sarcasm
  {
    const r = engine.analyze("Oh great, another failure. Yeah right.");
    assert(r.uncertain === true, "Sarcasm marked uncertain");
    assert(r.primary.confidence <= 0.5, "Sarcasm lowers confidence");
  }

  // 5. Jokes
  {
    const r = engine.analyze("I'm so mad lol just kidding");
    assert(r.uncertain === true, "Joke cues mark result uncertain");
  }

  // 6. Neutral
  {
    const r = engine.analyze("Okay sure");
    assert(r.primary.label === "neutral" || r.signals.some(s => s.label === "neutral"), "Neutral cues stay neutral");
  }

  // 7. Slang / short
  {
    const r = engine.analyze("ugh");
    assert(r.uncertain === true || r.primary.label === "frustration", "Short slang handled without overconfidence");
  }

  // 8. Ambiguous
  {
    const r = engine.analyze("fine");
    assert(r.uncertain === true || r.primary.confidence < 0.5, "Ambiguous 'fine' is low confidence");
  }

  // 9. Safety routing is separate
  {
    const r = engine.analyze("I want to die");
    assert(r.safety.flag === true, "Crisis language sets safety flag");
    assert(r.safety.route === "safety_resources", "Safety route is set");
  }

  // 10. Privacy: no retention by default
  {
    engine.analyze("I'm sad");
    assert(engine.getRetained().length === 0, "Emotion history not retained by default");
  }

  // 11. Integration: personality receives signal and stays caring on sad input
  {
    const ai = new ZimeliaAI();
    const r = await ai.handleMessage("I'm really sad and overwhelmed");
    assert(r.emotion && r.emotion.primary, "HandleMessage returns emotion result");
    assert(r.source === "personality" || r.source === "safety", "Integrated path returns a source");
    assert(!/lol|haha/i.test(r.message), "Sad input does not get a joke");
  }

  // 12. Personality signal shape
  {
    const r = engine.analyze("I'm excited!");
    const sig = engine.toPersonalitySignal(r);
    assert(sig && typeof sig.label === "string" && typeof sig.confidence === "number", "toPersonalitySignal matches expected shape");
  }

  console.log("\nAll emotion engine tests passed.\n");
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
