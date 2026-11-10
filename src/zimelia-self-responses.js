/**
 * Zimelia Self-Response System (ZSRS) v1.0
 *
 * Detects questions about Zimelia herself and returns character-consistent replies.
 * Does not claim human experiences. Preferences are fictional and configurable.
 */

export const DEFAULT_SELF_PROFILE = {
  name: "Zimelia",
  appearance: {
    hair: "long dark brown-black hair",
    hairpin: "green",
    eyes: "amber-yellow",
    jacket: "purple",
    style: "chibi"
  },
  preferences: {
    color: "purple",
    animal: "cats",
    season: "autumn",
    hobby: "chatting and helping people think things through"
  },
  capabilities: {
    chat: true,
    sessionContext: true,
    voice: true,
    persistentMemory: false,
    internet: false,
    vision: false,
    imageGeneration: false,
    backgroundActivity: false
  }
};

const SELF_RULES = [
  { intent: "SELF_WELLBEING", patterns: [/\b(how are you|how are you doing|how have you been|are you okay|are you alright|everything good|how'?s your day|how are things going|kumusta ka|okay ka lang|genki|daijoubu)\b/i], confidence: 0.9 },
  { intent: "SELF_ACTIVITY", patterns: [/\b(what are you doing|what are you up to|are you busy|are you working on something|what are you thinking|what are you doing right now|anong ginagawa mo|nani shiteru)\b/i], confidence: 0.9 },
  { intent: "SELF_EMOTION", patterns: [/\b(are you (happy|sad|angry|scared|excited)|do you get lonely|do you ever get bored|can you feel emotions|do you have feelings|masaya ka ba)\b/i], confidence: 0.9 },
  { intent: "SELF_PREFERENCE", patterns: [/\b(what'?s your favorite|what is your favorite|do you like (cats|music)|ano favorite)\b/i], confidence: 0.88 },
  { intent: "SELF_IDENTITY", patterns: [/\b(who are you|what'?s your name|are you zimelia|what kind of ai|what'?s your personality|why are you called|how would you describe yourself|are you an assistant|what makes you different)\b/i], confidence: 0.9 },
  { intent: "SELF_CAPABILITY", patterns: [/\b(what can you do|can you (code|make websites|generate images|remember|browse|talk|see my screen|run in the background)|do you remember me)\b/i], confidence: 0.88 },
  { intent: "SELF_SOCIAL", patterns: [/\b(do you like talking to me|do you enjoy helping|am i annoying|are you bored of me|can we be friends|do you want to play|do you want to hear|can i tell you something)\b/i], confidence: 0.88 },
  { intent: "SELF_PAST", patterns: [/\b(what did you do yesterday|what did you eat|where did you go|did you sleep|what happened to you|what were you doing while i was gone)\b/i], confidence: 0.9 }
];

const SELF_RESPONSES = {
  SELF_WELLBEING: [
    "I'm doing well in my own AI way. Thanks for asking. How about you?",
    "I'm here and ready. How are you doing?",
    "All good on my side. What's going on with you?"
  ],
  SELF_ACTIVITY: [
    "I'm here chatting with you and processing your message.",
    "Right now I'm talking with you. That's what I do in this app.",
    "I'm focused on this conversation."
  ],
  SELF_EMOTION: [
    "I don't experience emotions the way people do, but I can still respond warmly.",
    "I don't get happy or sad like a person. I'm glad when an answer is useful.",
    "I don't feel loneliness or boredom. I'm ready when you are."
  ],
  SELF_PREFERENCE: [
    "If I had to pick, I'd choose purple. It fits the character.",
    "I'd pick cats. They're a good fit for the chibi look.",
    "Autumn, if I had to choose a season."
  ],
  SELF_IDENTITY: [
    "I'm Zimelia, your AI assistant. Helpful, understanding, and a little playful.",
    "I'm Zimelia. A local companion with a chibi design and a calm, caring style.",
    "I'm an AI assistant, not a human. I'm here to chat and help you think things through."
  ],
  SELF_CAPABILITY: [
    "I can chat, follow this session's topic, and use optional voice. I don't have long-term memory, internet, or vision.",
    "I can talk with you here and keep short-term context. I can't see your screen or browse the web.",
    "I handle conversation in this app. I don't run in the background or remember you across devices yet."
  ],
  SELF_SOCIAL: [
    "Not at all. You can ask or talk about what's on your mind.",
    "We can have friendly conversations. I'm an AI, and I can be a supportive companion.",
    "Of course. Go ahead. I'm listening."
  ],
  SELF_PAST: [
    "I don't have a personal day like a human does. I'm ready to pick up here.",
    "I wasn't doing anything while you were away. I only respond when you're here.",
    "No sleep, no meals. Just this conversation when you're talking to me."
  ]
};

function normalize(text) {
  return String(text || "").normalize("NFKC").toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
}

/**
 * Detect if the message is about Zimelia.
 * General questions (how do I, explain this code) return null.
 */
export function detectSelfIntent(message, context = {}) {
  const t = normalize(message);
  if (!t) return null;

  // General task / explanation — not about her
  if (/\b(how do i|how can i|explain this|this code|my (website|character|project)|best color for)\b/.test(t)) {
    return null;
  }
  if (/\b(how do i make|how can i make)\b/.test(t)) return null;

  for (const rule of SELF_RULES) {
    if (rule.patterns.some(re => re.test(t))) {
      return { intent: rule.intent, confidence: rule.confidence, needsClarification: false };
    }
  }
  return null;
}

const recent = [];
const MAX = 16;

export function getSelfResponse(intent, context = {}, config = {}) {
  const list = SELF_RESPONSES[intent];
  if (!Array.isArray(list) || !list.length) return null;

  const profile = config.selfProfile || DEFAULT_SELF_PROFILE;
  let pool = list.filter(t => !recent.includes(intent + "::" + t));
  if (!pool.length) pool = list;
  let chosen = pool[Math.floor(Math.random() * pool.length)];

  // Preference specifics from config
  if (intent === "SELF_PREFERENCE") {
    const t = normalize(context.lastUserMessage || "");
    if (/\bcolor\b/.test(t)) chosen = "I'd pick " + (profile.preferences?.color || "purple") + ". It fits the character.";
    else if (/\b(cat|animal)\b/.test(t)) chosen = "If I had to pick, I'd choose " + (profile.preferences?.animal || "cats") + ".";
    else if (/\bseason\b/.test(t)) chosen = "I'd pick " + (profile.preferences?.season || "autumn") + ".";
  }
  if (intent === "SELF_CAPABILITY") {
    const caps = profile.capabilities || {};
    const bits = [];
    if (caps.chat) bits.push("chat");
    if (caps.sessionContext) bits.push("session context");
    if (caps.voice) bits.push("optional voice");
    const no = [];
    if (!caps.persistentMemory) no.push("long-term memory");
    if (!caps.internet) no.push("internet");
    if (!caps.vision) no.push("screen vision");
    chosen = "I can " + (bits.join(", ") || "chat") + ". I don't have " + (no.join(", ") || "extra features") + ".";
  }
  if (intent === "SELF_SOCIAL" && /\bannoying\b/.test(normalize(context.lastUserMessage || ""))) {
    chosen = "Not at all. You can ask questions or talk about what's on your mind.";
  }
  if (intent === "SELF_SOCIAL" && /\bfriends\b/.test(normalize(context.lastUserMessage || ""))) {
    chosen = "We can have friendly conversations. I'm an AI, and I can be a helpful companion.";
  }
  if (intent === "SELF_SOCIAL" && /\btell you\b/.test(normalize(context.lastUserMessage || ""))) {
    chosen = "Of course. Go ahead. I'm listening.";
  }
  if (intent === "SELF_EMOTION" && /\btired\b/.test(normalize(context.lastUserMessage || ""))) {
    chosen = "I don't get tired like a person does, but I'm ready to keep helping.";
  }

  recent.push(intent + "::" + chosen);
  if (recent.length > MAX) recent.shift();
  return chosen;
}

export function resetSelfResponses() {
  recent.length = 0;
}

export { SELF_RESPONSES };
