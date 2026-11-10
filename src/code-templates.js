/**
 * Offline code templates. Parameter substitution only. No eval.
 */

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">");
}

export const TEMPLATES = {
  html_page: {
    language: "html",
    title: "Simple HTML page",
    render(p) {
      return "<!DOCTYPE html>\n<html lang=\"en\">\n<head><meta charset=\"UTF-8\"><title>" + esc(p.title || "Page") + "</title></head>\n<body>\n  <h1>" + esc(p.title || "Hello") + "</h1>\n  <p>" + esc(p.body || "Content") + "</p>\n</body>\n</html>";
    }
  },
  js_function: {
    language: "javascript",
    title: "JavaScript function",
    render(p) {
      const name = String(p.name || "myFunction").replace(/[^A-Za-z0-9_]/g, "");
      return "function " + name + "(" + (p.params || "") + ") {\n  // " + (p.comment || "your code") + "\n  return null;\n}";
    }
  },
  form_validation: {
    language: "javascript",
    title: "Form validation",
    render() {
      return "function validateForm(form) {\n  const data = new FormData(form);\n  const errors = [];\n  if (!data.get('email')) errors.push('Email required');\n  return { ok: errors.length === 0, errors };\n}";
    }
  },
  fetch_example: {
    language: "javascript",
    title: "Fetch example",
    render(p) {
      return "async function load() {\n  const res = await fetch('" + esc(p.url || "/api") + "');\n  if (!res.ok) throw new Error('HTTP ' + res.status);\n  return res.json();\n}";
    }
  },
  json_shape: {
    language: "json",
    title: "JSON structure",
    render(p) {
      return JSON.stringify({ name: p.name || "item", value: p.value || 0 }, null, 2);
    }
  }
};

export function listTemplates() {
  return Object.keys(TEMPLATES).map(id => ({ id, ...TEMPLATES[id] }));
}

export function matchTemplate(text) {
  const t = String(text || "").toLowerCase();
  if (/\b(html|webpage|page)\b/.test(t)) return "html_page";
  if (/\b(form|validate)\b/.test(t)) return "form_validation";
  if (/\b(fetch|api request|http)\b/.test(t)) return "fetch_example";
  if (/\b(json)\b/.test(t)) return "json_shape";
  if (/\b(function|js|javascript)\b/.test(t)) return "js_function";
  return null;
}
