/**
 * Offline code templates. Safe substitution. No eval.
 */

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">");
}

function safeName(s) {
  return String(s || "item").replace(/[^A-Za-z0-9_]/g, "") || "item";
}

export const TEMPLATES = {
  html_page: {
    language: "html",
    title: "Simple HTML page",
    render(p) {
      return "<!DOCTYPE html>\n<html lang=\"en\">\n<head><meta charset=\"UTF-8\"><title>" + esc(p.title || "Page") + "</title></head>\n<body>\n  <h1>" + esc(p.title || "Hello") + "</h1>\n  <p>" + esc(p.body || "Content") + "</p>\n</body>\n</html>";
    }
  },
  css_layout: {
    language: "css",
    title: "Simple layout",
    render() {
      return ".wrap { max-width: 960px; margin: 0 auto; padding: 16px; }\n.row { display: flex; gap: 12px; flex-wrap: wrap; }\n.card { flex: 1 1 240px; padding: 12px; border: 1px solid #ccc; border-radius: 8px; }";
    }
  },
  js_function: {
    language: "javascript",
    title: "JavaScript function",
    render(p) {
      const name = safeName(p.name || "myFunction");
      return "function " + name + "(" + (p.params || "") + ") {\n  // " + (p.comment || "your code") + "\n  return null;\n}";
    }
  },
  dom_click: {
    language: "javascript",
    title: "Button click handler",
    render(p) {
      const id = safeName(p.id || "btn");
      const msg = JSON.stringify(p.message || "Hello");
      return "document.addEventListener('DOMContentLoaded', function () {\n  const el = document.getElementById('" + id + "');\n  if (!el) return;\n  el.addEventListener('click', function () {\n    alert(" + msg + ");\n  });\n});";
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
  },
  data_process: {
    language: "javascript",
    title: "Simple data processing",
    render() {
      return "function summarize(list) {\n  const nums = list.filter(n => typeof n === 'number');\n  const sum = nums.reduce((a, b) => a + b, 0);\n  return { count: nums.length, sum, avg: nums.length ? sum / nums.length : 0 };\n}";
    }
  },
  game_loop: {
    language: "javascript",
    title: "Basic game loop",
    render() {
      return "let running = true;\nfunction tick() {\n  if (!running) return;\n  // update and draw\n  requestAnimationFrame(tick);\n}\nrequestAnimationFrame(tick);";
    }
  },
  debug_null: {
    language: "javascript",
    title: "Debug null element",
    render() {
      return "// Common cause: script runs before the element exists.\n// Fix: wait for DOMContentLoaded, or move the script to the end of body.\ndocument.addEventListener('DOMContentLoaded', function () {\n  const el = document.getElementById('target');\n  if (!el) { console.warn('Element not found'); return; }\n  el.textContent = 'Ready';\n});";
    }
  }
};

export function listTemplates() {
  return Object.keys(TEMPLATES).map(id => ({ id, title: TEMPLATES[id].title, language: TEMPLATES[id].language }));
}

export function matchTemplate(text) {
  const t = String(text || "").toLowerCase();
  if (/\b(button|click|onclick)\b/.test(t)) return "dom_click";
  if (/\b(css|layout|style)\b/.test(t)) return "css_layout";
  if (/\b(html|webpage|page)\b/.test(t)) return "html_page";
  if (/\b(form|validate)\b/.test(t)) return "form_validation";
  if (/\b(fetch|api request|http)\b/.test(t)) return "fetch_example";
  if (/\b(json)\b/.test(t)) return "json_shape";
  if (/\b(average|sum|process data|list of numbers)\b/.test(t)) return "data_process";
  if (/\b(game|loop|animation)\b/.test(t)) return "game_loop";
  if (/\b(null|undefined|element not found|before the html)\b/.test(t)) return "debug_null";
  if (/\b(function|js|javascript)\b/.test(t)) return "js_function";
  return null;
}
