/**
 * Coding Brain settings. Secrets are never stored here.
 */

const KEY = "zimelia_coding_settings";

const DEFAULTS = {
  offlineEnabled: true,
  aiEnabled: false,
  defaultLanguage: "javascript",
  autoRetrieve: true,
  requireApproval: true
};

export function getCodingSettings() {
  try {
    if (typeof localStorage === "undefined") return { ...DEFAULTS };
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch (e) {
    return { ...DEFAULTS };
  }
}

export function setCodingSettings(partial) {
  const next = { ...getCodingSettings(), ...partial };
  delete next.apiKey;
  delete next.secret;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(KEY, JSON.stringify(next));
    }
  } catch (e) { /* ignore */ }
  return next;
}

export { DEFAULTS as DEFAULT_CODING_SETTINGS };
