/**
 * Basic validation. Does not prove correctness or security. Never evals code.
 */

export function validateCode(result) {
  const warnings = [];
  if (!result || !result.code) {
    return { ok: false, warnings: ["Empty code"] };
  }
  if (result.code.length < 8) warnings.push("Very short output");
  if (result.language === "json") {
    try { JSON.parse(result.code); } catch (e) { warnings.push("Malformed JSON"); }
  }
  if (result.language === "html" && !/<html/i.test(result.code)) warnings.push("Missing html tag");
  if (result.language === "javascript" && /\beval\s*\(/.test(result.code)) warnings.push("Contains eval");
  return { ok: warnings.length === 0, warnings };
}
