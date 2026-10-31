/**
 * Example: how to integrate the conversation manager with the existing chat UI.
 *
 * The current site uses an inline IIFE and ConversationManager inside index.html.
 * You can gradually replace the old history-only manager with this one.
 *
 * Because index.html is not an ES module, the simplest first step is:
 * 1. Serve the site with a local server that supports modules, OR
 * 2. Bundle these files, OR
 * 3. Copy the class into the existing script and call it from processUserMessage.
 */

import { createZimeliaAI } from "./zimelia-ai.js";

// Create once at startup
const zimelia = createZimeliaAI();

/**
 * Call this from your existing chat submit handler instead of (or before)
 * the old processUserMessage path.
 */
export async function onUserChat(text) {
  const result = await zimelia.handleMessage(text);

  // result.message  — reply text (clarification or fallback)
  // result.context  — structured snapshot for future modules
  // result.intent   — greeting | question | follow_up | etc.
  // result.source   — clarification | fallback | empty | duplicate

  return result;
}

export function resetChat() {
  zimelia.resetSession();
}

export function getCurrentContext() {
  return zimelia.getContext();
}
