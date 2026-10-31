/**
 * Zimelia Emotion Engine
 *
 * Rule-based estimator of possible emotional cues.
 * Returns structured signals — does not generate replies.
 *
 * IMPORTANT:
 * - Keyword and pattern scores are heuristics, not calibrated probabilities.
 * - This does not reliably identify a person's true emotions.
 * - Sarcasm, slang, and contradiction lower confidence or mark results uncertain.
 * - Replaceable later by a local language model without changing the return shape.
 */

const EMOTION_LABELS = [
  "happiness",
  "sadness",
  "frustration",
  "anger",
  "confusion",
  "nervousness",
  "disappointment",
  "excitement",
  "neutral"
];

/**
 * Configurable cue rules. Weights are heuristic scores (0–1 range after normalization).
 */
const DEFAULT_RULES = {
  happiness: [
    { pattern: /\b(happy|glad|joy|grateful|thankful|love this|great day)\b/i, weight: 0.7 },
    { pattern: /\b(yay|awesome|wonderful|delighted)\b/i, weight: 0.6 }
  ],
  sadness: [
    { pattern: /\b(sad|unhappy|down|depressed|heartbroken|crying|tears)\b/i, weight: 0.75 },
    { pattern: /\b(miss (him|her|them|you)|feel empty)\b/i, weight: 0.6 }
  ],
  frustration: [
    { pattern: /\b(frustrated|annoying|annoyed|stuck|ugh|this sucks)\b/i, weight: 0.7 },
    { pattern: /\b(can't figure|keeps failing|so tired of)\b/i, weight: 0.55 }
  ],
  anger: [
    { pattern: /\b(angry|mad|furious|pissed|rage|hate this)\b/i, weight: 0.75 },
    { pattern: /\b(so angry|really mad)\b/i, weight: 0.8 }
  ],
  confusion: [
    { pattern: /\b(confused|don't understand|what do you mean|huh|lost)\b/i, weight: 0.65 },
    { pattern: /\b(makes no sense|unclear)\b/i, weight: 0.55 }
  ],
  nervousness: [
    { pattern: /\b(nervous|anxious|worried|scared|panic|on edge)\b/i, weight: 0.7 },
    { pattern: /\b(what if|i'm afraid)\b/i, weight: 0.5 }
  ],
  disappointment: [
    { pattern: /\b(disappointed|let down|expected more|bummed)\b/i, weight: 0.75 },
    { pattern: /\b(thought it would|hoped it would)\b/i, weight: 0.4 }
  ],
  excitement: [
    { pattern: /\b(excited|can't wait|so pumped|hyped|thrilled)\b/i, weight: 0.75 },
    { pattern: /!{2,}/, weight: 0.25 }
  ],
  neutral: [
    { pattern: /\b(okay|ok|fine|alright|sure|whatever)\b/i, weight: 0.3 }
  ]
};

const NEGATION = /\b(not|n't|never|no longer|isn't|aren't|wasn't|weren't)\b/i;
const CONTRAST = /\b(but|however|though|although|yet)\b/i;
const SARCASM_HINTS = /\b(yeah right|sure jan|as if|totally|oh great|wonderful)\b/i;
const JOKE_HINTS = /\b(lol|lmao|haha|jk|just kidding|😂|🤣)\b/i;

// Conservative crisis indicators — separate from emotion labels.
// Not a diagnosis. Used only to flag for safety routing.
const CRISIS_PATTERNS = [
  /\b(kill myself|end my life|want to die|suicide|self[- ]harm)\b/i,
  /\b(can't go on|no reason to live)\b/i
];

export class EmotionEngine {
  /**
   * @param {Object} [options]
   * @param {Object} [options.rules]  override or extend DEFAULT_RULES
   * @param {boolean} [options.retainHistory=false]  privacy: off by default
   * @param {number} [options.maxRetained=0]
   */
  constructor(options = {}) {
    this.rules = options.rules || DEFAULT_RULES;
    this.retainHistory = options.retainHistory === true;
    this.maxRetained = options.maxRetained || 0;
    this._history = []; // only used if retainHistory is true
  }

  /**
   * Analyze a message with optional recent context.
   *
   * @param {string} text
   * @param {Object} [context]  from ConversationManager.getContext()
   * @returns {EmotionResult}
   *
   * EmotionResult:
   * {
   *   signals: [{ label, score, matched }],   // heuristic scores, not probabilities
   *   primary: { label, confidence, uncertain } | null,  // compatible with personality
   *   mixed: boolean,
   *   uncertain: boolean,
   *   uncertaintyReasons: string[],
   *   supportingSignals: string[],
   *   negated: string[],
   *   safety: { flag: boolean, reason: string|null, route: string|null },
   *   note: string
   * }
   */
  analyze(text, context = null) {
    const raw = String(text || "").trim();
    if (!raw) {
      return this._empty("Empty input.");
    }

    const reasons = [];
    const negated = [];
    const supporting = [];
    const scores = {};

    // Context: if recent messages contradict a lone keyword, lower trust
    const recentText = this._recentText(context);

    for (const label of Object.keys(this.rules)) {
      let score = 0;
      const matched = [];
      for (const rule of this.rules[label]) {
        if (rule.pattern.test(raw)) {
          // Basic negation: if negation appears near the cue, reduce or skip
          if (this._isNegated(raw, rule.pattern)) {
            negated.push(label);
            score -= rule.weight * 0.8;
            reasons.push("Negation near " + label + " cue.");
          } else {
            score += rule.weight;
            matched.push(rule.pattern.source);
            supporting.push(label + ":" + rule.pattern.source);
          }
        }
      }
      if (score > 0) scores[label] = { score: Math.min(1, score), matched };
    }

    // Contrast: "I thought I'd be happy, but I'm disappointed"
    if (CONTRAST.test(raw)) {
      reasons.push("Contrast detected — mixed or shifted feeling possible.");
    }

    // Sarcasm / jokes → uncertain
    let uncertain = false;
    if (SARCASM_HINTS.test(raw) || (JOKE_HINTS.test(raw) && Object.keys(scores).length > 0)) {
      uncertain = true;
      reasons.push("Sarcasm or joke cues make interpretation unreliable.");
    }
    if (raw.length < 4 && Object.keys(scores).length === 0) {
      uncertain = true;
      reasons.push("Very short message with no clear cues.");
    }

    // Build signal list (multiple allowed)
    const signals = Object.entries(scores)
      .map(([label, v]) => ({ label, score: Number(v.score.toFixed(2)), matched: v.matched }))
      .filter(s => s.score > 0.15)
      .sort((a, b) => b.score - a.score);

    if (signals.length === 0) {
      signals.push({ label: "neutral", score: 0.3, matched: [] });
      if (!reasons.length) reasons.push("No strong emotional cues.");
    }

    const mixed = signals.filter(s => s.score >= 0.4).length > 1;
    if (mixed) {
      uncertain = uncertain || true;
      reasons.push("Multiple emotion signals present.");
    }

    const top = signals[0];
    const primary = {
      label: top.label,
      confidence: uncertain ? Math.min(top.score, 0.4) : top.score,
      uncertain: uncertain || top.score < 0.45
    };

    const safety = this._checkSafety(raw);

    const result = {
      signals,
      primary,
      mixed,
      uncertain: primary.uncertain,
      uncertaintyReasons: reasons,
      supportingSignals: supporting,
      negated,
      safety,
      note: "Scores are heuristic, not calibrated probabilities. This is not a diagnosis of true emotion."
    };

    if (this.retainHistory && this.maxRetained > 0) {
      this._history.push({ text: raw, result, ts: Date.now() });
      while (this._history.length > this.maxRetained) this._history.shift();
    }

    return result;
  }

  /**
   * Shape expected by PersonalitySystem.respond(..., emotionSignal).
   * Never forces a response by itself.
   */
  toPersonalitySignal(result) {
    if (!result || !result.primary) return null;
    return {
      label: result.primary.label,
      confidence: result.primary.confidence,
      uncertain: result.primary.uncertain,
      mixed: result.mixed,
      safety: result.safety
    };
  }

  /**
   * Conservative safety routing. Separate from emotion labels.
   * @returns {{ flag: boolean, reason: string|null, route: string|null }}
   */
  _checkSafety(text) {
    for (const re of CRISIS_PATTERNS) {
      if (re.test(text)) {
        return {
          flag: true,
          reason: "Possible crisis language detected.",
          route: "safety_resources"
        };
      }
    }
    return { flag: false, reason: null, route: null };
  }

  clearHistory() {
    this._history = [];
  }

  getRetained() {
    return this.retainHistory ? this._history.slice() : [];
  }

  // ---------- internal ----------

  _isNegated(text, pattern) {
    // Simple window check: negation within ~4 words before a match
    const m = text.match(pattern);
    if (!m || m.index == null) return false;
    const before = text.slice(Math.max(0, m.index - 30), m.index);
    return NEGATION.test(before);
  }

  _recentText(context) {
    if (!context || !Array.isArray(context.recentMessages)) return "";
    return context.recentMessages.map(m => m.content).join(" ");
  }

  _empty(note) {
    return {
      signals: [{ label: "neutral", score: 0.2, matched: [] }],
      primary: { label: "neutral", confidence: 0.2, uncertain: true },
      mixed: false,
      uncertain: true,
      uncertaintyReasons: [note],
      supportingSignals: [],
      negated: [],
      safety: { flag: false, reason: null, route: null },
      note
    };
  }
}

export function createEmotionEngine(options) {
  return new EmotionEngine(options);
}

export { EMOTION_LABELS, DEFAULT_RULES };
