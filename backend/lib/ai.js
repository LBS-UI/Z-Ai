// ═══════════════════════════════════════════════════════════════════
// ai.js — the only file that talks to the AI provider. Swapping
// providers later means editing this file, nothing else.
// ═══════════════════════════════════════════════════════════════════

const MODEL = process.env.AI_MODEL || 'claude-sonnet-4-5';
const API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * @param {string} systemPrompt
 * @param {{role: 'user'|'assistant', content: string}[]} messages
 * @returns {Promise<string>} the assistant's reply text
 */
async function getZimeliaReply(systemPrompt, messages) {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey || apiKey.includes('your-key-here')) {
    throw new Error('AI_API_KEY is not configured. Set it in backend/.env');
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`AI provider error ${response.status}: ${errBody.slice(0, 300)}`);
  }

  const data = await response.json();
  const textBlock = (data.content || []).find((block) => block.type === 'text');
  return textBlock ? textBlock.text : '';
}

module.exports = { getZimeliaReply };
