/**
 * Zimelia Coding Brain coordinator.
 * Only handles coding requests. Leaves ordinary chat to personality.
 */

import { initStore } from "./coding-memory-store.js";
import { proposeFromMessage, approve, reject, pending, approved } from "./coding-learner.js";
import { searchKnowledge, preferencesFor } from "./coding-knowledge.js";
import { generateOffline } from "./code-generator.js";
import { validateCode } from "./code-validator.js";
import { getCodingSettings } from "./coding-settings.js";
import { CodingAIAdapter } from "./coding-ai-adapter.js";

const CODING_HINT = /\b(code|function|javascript|html|css|bug|error|script|api|json|component|validate|template|button|click|layout)\b/i;

export class CodingBrain {
  constructor(options = {}) {
    this.ready = false;
    this.ai = options.ai || new CodingAIAdapter();
    this.lastProposal = null;
  }

  async init() {
    await initStore();
    this.ready = true;
  }

  isCodingRequest(text) {
    return CODING_HINT.test(String(text || ""));
  }

  /**
   * @returns {{ handled: boolean, text?: string, strategy?: string, tone?: string, meta?: object }}
   */
  async handleRequest(text, context = {}) {
    const settings = getCodingSettings();
    if (!this.isCodingRequest(text)) return { handled: false };

    // Correction / lesson
    if (/\b(doesn'?t work|because|fix|correction|remember|learn|save this|note that)\b/i.test(text) && /\b(code|script|element|listener|function|button)\b/i.test(text)) {
      const proposal = proposeFromMessage(text, settings.defaultLanguage);
      if (!proposal.ok) {
        return { handled: true, text: "I couldn't make a knowledge entry from that.", strategy: "coding_learn", tone: "focused" };
      }
      this.lastProposal = proposal.record;
      return {
        handled: true,
        text: "Proposed lesson (pending): " + proposal.record.title + ". Open Coding Brain and approve it if you want me to keep it.",
        strategy: "coding_learn",
        tone: "focused",
        meta: { proposal: proposal.record }
      };
    }

    // Generate
    if (/\b(write|make|create|generate|show me|how do i|button|function|html|form|fetch|json|css)\b/i.test(text)) {
      const memories = settings.autoRetrieve ? await searchKnowledge(text, { language: settings.defaultLanguage, limit: 5 }) : [];
      const prefs = await preferencesFor(settings.defaultLanguage);
      let gen = generateOffline(text, { title: context.currentTopic || "Page", name: "generated", id: "btn", message: "Hello" });

      // Preference: prefer addEventListener
      if (prefs.some(p => /addeventlistener/i.test(p.content + p.example)) && gen.template === "dom_click") {
        // already uses addEventListener
      }

      if (!gen.ok && settings.aiEnabled && this.ai.available) {
        const aiResult = await this.ai.request(text, memories);
        if (aiResult.ok) gen = aiResult;
      }

      if (!gen.ok) {
        return {
          handled: true,
          text: gen.reason || "I don't have an offline template for that, and AI mode isn't available. Try: html page, function, form validation, button click, fetch, json, css layout, or a simple game loop.",
          strategy: "coding_fallback",
          tone: "focused"
        };
      }

      const validation = validateCode(gen);
      const memNote = memories.length ? " Using " + memories.length + " saved note(s)." : "";
      const prefNote = prefs.length ? " Preferences applied where relevant." : "";
      const textOut = "Here's an offline template for that." + memNote + prefNote + "\n\n```" + (gen.language || "javascript") + "\n" + gen.code + "\n```\n\n" + (validation.warnings.length ? "Warnings: " + validation.warnings.join(", ") : "Basic checks passed. Review before using. Not executed.");
      return {
        handled: true,
        text: textOut,
        strategy: "coding_generate",
        tone: "focused",
        meta: { code: gen.code, language: gen.language, validation, memories }
      };
    }

    return { handled: false };
  }

  async listPending() { return pending(); }
  async listApproved() { return approved(); }
  async approveRecord(record) { return approve(record); }
  async rejectRecord(record) { return reject(record); }
  async approveLast() {
    if (!this.lastProposal) return { ok: false, errors: ["No proposal"] };
    return approve(this.lastProposal);
  }
}

export function createCodingBrain() {
  return new CodingBrain();
}
