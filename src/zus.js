
/*
 * ZUS 2.0
 * Zimelia Understanding System
 *
 * Purpose:
 * - Recognize greetings and questions
 * - Detect requests for help and explanations
 * - Recognize basic emotional cues
 * - Handle slang and variations
 * - Return structured intent data
 *
 * Note:
 * This is a rule-based understanding layer,
 * not a full language model.
 */

const ZUS = (() => {
  // 1. Normalize the user's message
  function normalize(message) {
    return String(message ?? "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[’‘]/g, "'")
      .replace(/([a-z])\1{3,}/g, "$1$1$1")
      .replace(/[^\p{L}\p{N}\s'?!.,]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // 2. Word matching without accidental substrings
  function hasAny(text, phrases) {
    return phrases.some(phrase => {
      const escaped = phrase.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      return new RegExp(
        `(^|\\s)${escaped}(?=$|\\s|[?!.,])`,
        "u"
      ).test(text);
    });
  }

  // 3. Recognize the user's intent
  function understand(message, context = {}) {
    const text = normalize(message);

    const result = {
      original: String(message ?? ""),
      normalized: text,
      intent: "UNKNOWN",
      emotion: "NEUTRAL",
      confidence: 0,
      needsClarification: false,
      entities: {},
      responseType: "FALLBACK"
    };

    if (!text) {
      return {
        ...result,
        intent: "EMPTY_MESSAGE",
        responseType: "ASK_INPUT"
      };
    }

    const rules = [
      {
        intent: "GREETING",
        patterns: [
          "hi", "hello", "hey", "heyy", "yo",
          "yow", "hallo", "sup", "good morning",
          "good afternoon", "good evening",
          "good night", "good day"
        ],
        responseType: "GREET"
      },
      {
        intent: "FAREWELL",
        patterns: [
          "bye", "goodbye", "see you", "see ya",
          "gotta go", "talk to you later"
        ],
        responseType: "FAREWELL"
      },
      {
        intent: "THANKS",
        patterns: [
          "thanks", "thank you", "thx",
          "ty", "much appreciated"
        ],
        responseType: "ACKNOWLEDGE"
      },
      {
        intent: "APOLOGY",
        patterns: [
          "sorry", "my apologies", "i apologize"
        ],
        responseType: "REASSURE"
      },
      {
        intent: "REQUEST_HELP",
        patterns: [
          "help me", "can you help",
          "i need help", "assist me",
          "help me with", "could you help"
        ],
        responseType: "OFFER_HELP"
      },
      {
        intent: "EXPLANATION_REQUEST",
        patterns: [
          "explain", "what does this mean",
          "make it simpler", "explain it simply",
          "i don't understand", "i do not understand",
          "i dont understand", "clarify this",
          "break it down"
        ],
        responseType: "EXPLAIN"
      },
      {
        intent: "HOW_TO",
        patterns: [
          "how do i", "how can i", "how to",
          "how does", "how can we",
          "how do you", "steps to"
        ],
        responseType: "GUIDE"
      },
      {
        intent: "WHY_QUESTION",
        patterns: [
          "why", "what is the reason",
          "how come"
        ],
        responseType: "EXPLAIN_REASON"
      },
      {
        intent: "WHEN_QUESTION",
        patterns: [
          "when", "what time", "what date"
        ],
        responseType: "ANSWER_TIME"
      },
      {
        intent: "WHERE_QUESTION",
        patterns: [
          "where", "which place"
        ],
        responseType: "ANSWER_LOCATION"
      },
      {
        intent: "WHAT_QUESTION",
        patterns: [
          "what", "which", "who", "whom",
          "whose", "what kind"
        ],
        responseType: "ANSWER_QUESTION"
      },
      {
        intent: "FEELING_CHECK",
        patterns: [
          "how are you", "how are you doing",
          "how have you been"
        ],
        responseType: "PERSONALITY_REPLY"
      }
    ];

    // 4. Detect emotions separately from intent
    const emotionRules = [
      {
        emotion: "FRUSTRATED",
        patterns: [
          "this is frustrating", "im frustrated",
          "i'm frustrated", "this is annoying",
          "im so annoyed", "i'm so annoyed"
        ]
      },
      {
        emotion: "SAD",
        patterns: [
          "i feel sad", "im sad", "i'm sad",
          "feeling down", "i feel lonely",
          "i feel alone", "im upset", "i'm upset"
        ]
      },
      {
        emotion: "CONFUSED",
        patterns: [
          "im confused", "i'm confused",
          "im lost", "i'm lost",
          "i don't get it", "i dont get it",
          "i don't understand", "i dont understand"
        ]
      },
      {
        emotion: "HAPPY",
        patterns: [
          "im happy", "i'm happy",
          "im excited", "i'm excited",
          "that made my day", "im so glad",
          "i'm so glad"
        ]
      }
    ];

    for (const rule of emotionRules) {
      if (hasAny(text, rule.patterns)) {
        result.emotion = rule.emotion;
        break;
      }
    }

    // 5. Detect greetings without matching
    // words embedded inside unrelated words.
    const isGreeting =
      /^(hi|hello|hey+|yo+|yow+|hallo|sup)\b/u
        .test(text) ||
      /^(good morning|good afternoon|good evening|good night|good day)\b/u
        .test(text);

    // 6. Choose the most relevant intent.
    // Requests for explanations take priority over
    // individual question words.
    const priority = [
      "EXPLANATION_REQUEST",
      "REQUEST_HELP",
      "HOW_TO",
      "FEELING_CHECK",
      "FAREWELL",
      "THANKS",
      "APOLOGY",
      "WHY_QUESTION",
      "WHEN_QUESTION",
      "WHERE_QUESTION",
      "WHAT_QUESTION",
      "GREETING"
    ];

    let matches = rules.filter(rule =>
      hasAny(text, rule.patterns)
    );

    // A greeting followed by a question is not
    // necessarily just a greeting.
    if (isGreeting && matches.length === 0) {
      matches = [
        rules.find(rule => rule.intent === "GREETING")
      ];
    }

    // A greeting by itself is a greeting.
    // A message such as "hi, how do I code?"
    // should instead be classified as HOW_TO.
    const meaningful = matches
      .filter(Boolean)
      .sort(
        (a, b) =>
          priority.indexOf(a.intent) -
          priority.indexOf(b.intent)
      );

    if (meaningful.length > 0) {
      const best = meaningful[0];

      result.intent = best.intent;
      result.responseType = best.responseType;
      result.confidence = 0.75;
    }

    // 7. Question mark is a signal, not proof
    // that the message contains a question.
    if (
      text.includes("?") &&
      result.intent === "UNKNOWN"
    ) {
      result.responseType = "CLARIFY";
      result.needsClarification = true;
      result.confidence = 0.3;
    }

    // 8. Handle a follow-up to a previous topic
    if (
      context.previousIntent === "EXPLANATION_REQUEST" &&
      ["what", "why", "how", "when", "where"].includes(text)
    ) {
      result.intent = "FOLLOW_UP";
      result.responseType = "CONTINUE_EXPLANATION";
      result.confidence = 0.6;
    }

    // 9. Return the result for the response engine
    return result;
  }

  return {
    normalize,
    understand
  };
})();

export default ZUS;
