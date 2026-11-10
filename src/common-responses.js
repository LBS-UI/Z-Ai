/**
 * Zimelia Common Responses System (ZCRS) v1.0
 *
 * Recognizes everyday conversational categories.
 * Does not generate final tone — personality still owns that.
 * Rule-based. Not full language understanding.
 */

const CATEGORIES = [
  "greeting",
  "gratitude",
  "apology",
  "agreement",
  "disagreement",
  "laughter",
  "confusion",
  "boredom",
  "compliment",
  "farewell",
  "about_self",
  "everyday",
  "emotional"
];

/**
 * Patterns are tested against normalized text.
 * Longer / more specific rules should be listed first within a category.
 */
const RULES = [
  {
    category: "about_self",
    intent: "about_self",
    patterns: [
      /\b(who are you|what('s| is) your name|what can you do|are you an ai|how do you work|do you remember me|what('s| is) your personality|can you speak (japanese|filipino)|what are your limitations)\b/i
    ],
    confidence: 0.9
  },
  {
    category: "confusion",
    intent: "confusion",
    patterns: [
      /\b(i don'?t (get|understand)|i dont (get|understand)|wdym|what do you mean|can you explain|explain it differently|say that again|can you simplify|di ko gets|wakaranai|ano ibig sabihin)\b/i,
      /^(what|huh|nani)\??$/i
    ],
    confidence: 0.85
  },
  {
    category: "gratitude",
    intent: "gratitude",
    patterns: [
      /\b(thanks|thank you|thx|ty|i appreciate|you'?re a lifesaver|salamat|arigatou)\b/i
    ],
    confidence: 0.8
  },
  {
    category: "apology",
    intent: "apology",
    patterns: [
      /\b(sorry|my bad|i apologize|sorry for asking|sorry for bothering)\b/i
    ],
    confidence: 0.8
  },
  {
    category: "farewell",
    intent: "farewell",
    patterns: [
      /\b(bye|goodbye|see you|see ya|talk to you later|i have to go|i'?m leaving|good night)\b/i
    ],
    confidence: 0.8
  },
  {
    category: "greeting",
    intent: "greeting",
    patterns: [
      /^(hi+|hey+|hello|yo|sup|yow|hallo|kumusta|kamusta( ka)?|good (morning|afternoon|evening|day))\b/i,
      /\b(what'?s up|how are you|how'?s your day)\b/i
    ],
    confidence: 0.85
  },
  {
    category: "laughter",
    intent: "laughter",
    patterns: [
      /\b(lol+|lmao+|haha+|hehe+|xd|that'?s funny|i'?m crying laughing|bruh|no way)\b/i
    ],
    confidence: 0.7
  },
  {
    category: "boredom",
    intent: "boredom",
    patterns: [
      /\b(i'?m bored|nothing to do|just chilling|doing nothing|what should we do|let'?s talk|entertain me|i'?m (tired|sleepy))\b/i
    ],
    confidence: 0.8
  },
  {
    category: "compliment",
    intent: "compliment",
    patterns: [
      /\b(you'?re (smart|funny|helpful|amazing)|good job|nice!|i like your personality)\b/i
    ],
    confidence: 0.85
  },
  {
    category: "agreement",
    intent: "agreement",
    patterns: [ /^(yes|yep|yeah|sure|okay|ok|alright|sige|ayos)\b/i ],
    confidence: 0.7
  },
  {
    category: "disagreement",
    intent: "disagreement",
    patterns: [ /^(no|nope|not really|i disagree|i don'?t think so)\b/i ],
    confidence: 0.7
  },
  {
    category: "everyday",
    intent: "everyday",
    patterns: [
      /\b(i passed|i finished|i made a mistake|i have a question|guess what|something happened|i have (good|bad) news|i finally did it)\b/i
    ],
    confidence: 0.75
  },
  {
    category: "emotional",
    intent: "emotional",
    patterns: [
      /\b(i'?m (happy|excited|frustrated|confused|nervous|sad|lonely)|i feel (sad|alone|disappointed)|i don'?t feel like talking)\b/i
    ],
    confidence: 0.75
  }
];

const RESPONSES = {
  greeting: [
    "Hey. What's up?",
    "Hello. How's your day going?",
    "Hi. What are we looking at today?",
    "I'm here. How about you?"
  ],
  gratitude: [
    "You're welcome. Happy to help.",
    "Anytime.",
    "Glad that helped."
  ],
  apology: [
    "No worries. You can ask.",
    "It's okay. Let's figure it out.",
    "You don't need to apologize for asking."
  ],
  agreement: [
    "Okay. What's the next part?",
    "Alright.",
    "Got it."
  ],
  disagreement: [
    "Okay. What would you change?",
    "Fair. Tell me your take.",
    "Alright. We can look at it differently."
  ],
  laughter: [
    "Ha. What got you?",
    "Okay that one landed.",
    "Tell me more."
  ],
  confusion: [
    "No worries. Let me try another way.",
    "Which part was unclear?",
    "Sure. Let's make it simpler."
  ],
  boredom: [
    "Want a random topic, a small challenge, or just to talk?",
    "Just chilling? We can find something light.",
    "Want a fact or a short puzzle?"
  ],
  compliment: [
    "Thanks. Glad that was useful.",
    "I'll take that.",
    "Happy it helped."
  ],
  farewell: [
    "See you. Take care.",
    "Bye for now.",
    "Good night. Rest well."
  ],
  about_self: [
    "I'm Zimelia, a local assistant. I can chat, track this session's topic, and respond with a set personality. I don't have long-term memory unless that's added later.",
    "I'm an AI companion on this page. I can talk, follow the current conversation, and use optional voice. I don't remember you across devices yet.",
    "I can handle everyday chat, simple questions, and session context. I'm not a full language model, and I won't invent features I don't have."
  ],
  everyday: [
    "Oh? Tell me more.",
    "Okay. What happened?",
    "I'm listening."
  ],
  emotional: [
    "That sounds like a lot. Want to talk, or just sit with it?",
    "Okay. You don't have to explain everything.",
    "I hear you."
  ]
};

function normalize(text) {
  return String(text || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function hasNegation(text, word) {
  return new RegExp("\\b(not|n't|never)\\s+" + word + "\\b", "i").test(text);
}

/**
 * Classify a message into a common category.
 * @returns {{ intent: string, confidence: number, category: string|null, needsClarification: boolean, secondary: string|null }}
 */
export function classifyCommon(text, context = {}) {
  const t = normalize(text);
  const result = {
    intent: "unknown",
    confidence: 0,
    category: null,
    needsClarification: false,
    secondary: null
  };
  if (!t) return result;

  const hits = [];
  for (const rule of RULES) {
    if (rule.patterns.some(re => re.test(t))) {
      hits.push(rule);
    }
  }
  if (!hits.length) return result;

  // Mixed-intent priority: request / question / confusion over pure social
  const priority = [
    "confusion", "about_self", "emotional", "boredom",
    "gratitude", "apology", "farewell", "greeting",
    "compliment", "laughter", "agreement", "disagreement", "everyday"
  ];
  hits.sort((a, b) => priority.indexOf(a.category) - priority.indexOf(b.category));

  let best = hits[0];

  // False-positive guards
  if (best.category === "greeting" && /\b(what does|mean|in japanese|in filipino|define)\b/.test(t)) {
    return result;
  }
  if (best.category === "gratitude" && /\b(why|how|doesn't|doesn't work|explain|help)\b/.test(t)) {
    result.secondary = "gratitude";
    return { ...result, intent: "mixed", confidence: 0.4, category: null, needsClarification: false };
  }
  if (best.category === "farewell" && /\b(can you|explain|first|before)\b/.test(t)) {
    result.secondary = "farewell";
    return { ...result, intent: "mixed", confidence: 0.4, category: null };
  }
  if (best.category === "laughter" && /\b(don'?t like|not funny|i hate)\b/.test(t)) {
    return result;
  }
  if (best.category === "emotional" && hasNegation(t, "sad")) {
    return { ...result, intent: "unknown", confidence: 0.2 };
  }
  if ((best.category === "agreement" || best.category === "disagreement") && !context.currentTopic && !context.lastAssistantMessage) {
    return { ...result, intent: best.intent, confidence: 0.35, category: best.category, needsClarification: true };
  }

  return {
    intent: best.intent,
    confidence: best.confidence,
    category: best.category,
    needsClarification: false,
    secondary: hits[1] ? hits[1].category : null
  };
}

const recent = [];
const MAX_RECENT = 20;

export function pickCommonResponse(category, context = {}) {
  const list = RESPONSES[category];
  if (!Array.isArray(list) || !list.length) return null;
  const available = list.filter(t => !recent.includes(category + "::" + t));
  const pool = available.length ? available : list;
  let chosen = pool[Math.floor(Math.random() * pool.length)];

  // Context tweaks
  if (category === "farewell" && /\bnight\b/i.test(context.lastUserMessage || "")) {
    chosen = "Good night. Rest well.";
  }
  if (category === "everyday" && /\b(passed|finished|finally did it|good news)\b/i.test(context.lastUserMessage || "")) {
    chosen = "Nice. How did it turn out?";
  }
  if (category === "everyday" && /\bbad news\b/i.test(context.lastUserMessage || "")) {
    chosen = "Okay. What happened?";
  }
  if (category === "emotional" && /\bdon'?t feel like talking\b/i.test(context.lastUserMessage || "")) {
    chosen = "That's okay. You don't have to explain anything right now.";
  }
  if (category === "emotional" && /\bfrustrated\b/i.test(context.lastUserMessage || "") && /\bcode\b/i.test(context.lastUserMessage || "")) {
    chosen = "That sounds frustrating. Let's look at the error and work through it.";
  }

  recent.push(category + "::" + chosen);
  if (recent.length > MAX_RECENT) recent.shift();
  return chosen;
}

export function resetCommonResponses() {
  recent.length = 0;
}

export { CATEGORIES, RESPONSES };
