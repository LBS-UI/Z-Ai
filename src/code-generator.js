/**
 * Offline code generator. Does not execute generated code.
 */

import { matchTemplate, TEMPLATES } from "./code-templates.js";

export function generateOffline(request, params = {}) {
  const id = matchTemplate(request);
  if (!id || !TEMPLATES[id]) {
    return {
      ok: false,
      mode: "offline",
      reason: "No matching offline template. This request needs more detail or AI mode.",
      code: "",
      template: null
    };
  }
  const code = TEMPLATES[id].render(params);
  return {
    ok: true,
    mode: "offline",
    code,
    template: id,
    language: TEMPLATES[id].language,
    note: "Offline template. Review before use. Not executed."
  };
}
