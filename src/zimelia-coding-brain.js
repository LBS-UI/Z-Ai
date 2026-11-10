/**
 * Zimelia Coding Brain coordinator.
 * Only handles coding requests. Leaves ordinary chat to personality.
 */

import { initStore, listRecords } from "./coding-memory-store.js";
import { proposeFromMessage, approve, reject, pending, approved } from "./coding-learner.js";
import { generateOffline } from "./code-generator.js";
import { validateCode } from "./code-validator.js";
import { getCodingSettings } from "./coding-settings.js";

const CODING_HINT = /\b(code|function|javascript|html|css|bug|error|script|api|json|component|validate|template)\b/i;

export class CodingBrain {
  constructor() {
    this.ready = false;
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

    // Learning proposal
    if (/\b(remember|learn|save this|note that)\b/i.test(text)) {
      const proposal = proposeFromMessage(text, settings.defaultLanguage);
      if (!proposal.ok) return { handled: true, text: "I couldn't make a knowledge entry from that.", strategy: "coding_learn", tone: "focused" };
      return {
        handled: true,
        text: "Proposed entry (pending approval): " + proposal.record.title + ". Say /coding approve to save it.",
        strategy: "coding_learn",
        tone: "focused",
        meta: { proposal: proposal.record }
      };
    }

    // Generate
    if (/\b(write|make|create|generate|show me|how do i)\b/i.test(text) || /\b(function|html|form|fetch|json)\b/i.test(text)) {
      const memories = settings.autoRetrieve ? await approved({ language: settings.defaultLanguage }) : [];
      const relevant = memories.slice(0, 3);
      const gen = generateOffline(text, { title: context.currentTopic || "Page", name: "generated" });
      if (!gen.ok) {
        if (settings.aiEnabled) {
          return { handled: true, text: "Offline templates don't cover that, and AI mode isn't wired to a provider here. Try a simpler request (html page, function, form validation, fetch, json).", strategy: "coding_fallback", tone: "focused" };
        }
        return { handled: true, text: gen.reason, strategy: "coding_fallback", tone: "focused" };
      }
      const validation = validateCode(gen);
      const memNote = relevant.length ? " Using " + relevant.length + " saved note(s)." : "";
      const textOut = "Here's an offline template for that." + memNote + "\n\n```" + gen.language + "\n" + gen.code + "\n```\n\n" + (validation.warnings.length ? "Warnings: " + validation.warnings.join(", ") : "Basic checks passed. Review before using. Not executed.");
      return { handled: true, text: textOut, strategy: "coding_generate", tone: "focused", meta: { code: gen.code, validation } };
    }

    return { handled: false };
  }

  async listPending() { return pending(); }
  async listApproved() { return approved(); }
  async approveRecord(record) { return approve(record); }
  async rejectRecord(record) { return reject(record); }
}

export function createCodingBrain() {
  return new CodingBrain();
}
