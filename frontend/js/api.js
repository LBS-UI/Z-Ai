// ═══════════════════════════════════════════════════════════════════
// api.js — thin fetch wrapper for talking to the Zimelia backend.
// The backend URL is the ONLY place that changes if you deploy the
// API somewhere other than localhost.
// ═══════════════════════════════════════════════════════════════════

const API_BASE = window.ZIMELIA_API_BASE || 'http://localhost:3001/api';

async function apiRequest(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include', // send the session cookie
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no JSON body */
  }

  if (!res.ok) {
    const error = new Error((data && data.error) || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return data;
}

const Api = {
  // auth
  signup: (displayName, password) => apiRequest('/auth/signup', { method: 'POST', body: { displayName, password } }),
  login: (displayName, password) => apiRequest('/auth/login', { method: 'POST', body: { displayName, password } }),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  me: () => apiRequest('/auth/me'),

  // chat
  sendMessage: (message, conversationId) => apiRequest('/chat', { method: 'POST', body: { message, conversationId } }),

  // conversations
  listConversations: () => apiRequest('/conversations'),
  getConversation: (id) => apiRequest(`/conversations/${id}`),
  deleteConversation: (id) => apiRequest(`/conversations/${id}`, { method: 'DELETE' }),

  // memories
  listMemories: () => apiRequest('/memories'),
  addMemory: (memoryText, category) => apiRequest('/memories', { method: 'POST', body: { memoryText, category } }),
  updateMemory: (id, patch) => apiRequest(`/memories/${id}`, { method: 'PUT', body: patch }),
  deleteMemory: (id) => apiRequest(`/memories/${id}`, { method: 'DELETE' }),
  clearMemories: () => apiRequest('/memories', { method: 'DELETE' }),

  // preferences
  getPreferences: () => apiRequest('/preferences'),
  updatePreferences: (patch) => apiRequest('/preferences', { method: 'PUT', body: patch }),
};
