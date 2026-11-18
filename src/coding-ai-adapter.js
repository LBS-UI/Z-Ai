/**
 * Optional AI provider adapter.
 * No credentials are stored here. Provider is injected or absent.
 */

export class CodingAIAdapter {
  /**
   * @param {Object} [options]
   * @param {Function} [options.generate] async (prompt, context) => { code, language, files? }
   */
  constructor(options = {}) {
    this.generate = options.generate || null;
    this.available = typeof this.generate === "function";
  }

  async request(task, memories = []) {
    if (!this.available) {
      return { ok: false, reason: "AI provider not configured." };
    }
    try {
      const result = await this.generate(task, { memories: memories.slice(0, 5) });
      if (!result || !result.code) return { ok: false, reason: "Empty AI response." };
      return { ok: true, mode: "ai", code: result.code, language: result.language || "javascript", files: result.files || null };
    } catch (err) {
      return { ok: false, reason: "AI request failed: " + (err && err.message ? err.message : "unknown") };
    }
  }
}

export function createAIAdapter(options) {
  return new CodingAIAdapter(options);
}
