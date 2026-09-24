// ═══════════════════════════════════════════════════════════════════
// chat.js — the chat interface: sending messages, rendering the
// conversation, the typing indicator, and the conversation list.
// ═══════════════════════════════════════════════════════════════════

const ZimeliaChat = (() => {
  const messagesEl = document.getElementById('chatMessages');
  const gateEl = document.getElementById('chatGate');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSend');
  const listEl = document.getElementById('conversationList');
  const newChatBtn = document.getElementById('newChatBtn');
  const statusEl = document.getElementById('chatStatus');

  let activeConversationId = null;
  let signedIn = false;

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderMessage(role, content, { error = false } = {}) {
    const bubble = document.createElement('div');
    bubble.className = `msg msg--${role}${error ? ' msg--error' : ''}`;
    bubble.textContent = content;
    messagesEl.appendChild(bubble);
    scrollToBottom();
    return bubble;
  }

  function renderTyping() {
    const bubble = document.createElement('div');
    bubble.className = 'msg msg--assistant';
    bubble.innerHTML = '<span class="typing-dots"><span></span><span></span><span></span></span>';
    messagesEl.appendChild(bubble);
    scrollToBottom();
    return bubble;
  }

  function setSignedIn(value) {
    signedIn = value;
    input.disabled = !value;
    sendBtn.disabled = !value;
    gateEl.style.display = value ? 'none' : 'flex';
    gateEl.style.flexDirection = 'column';
    gateEl.style.alignItems = 'center';
    gateEl.style.gap = '10px';
    if (value) {
      messagesEl.querySelectorAll('.msg').forEach((n) => n.remove());
      loadConversations();
    } else {
      messagesEl.innerHTML = '';
      messagesEl.appendChild(gateEl);
      listEl.innerHTML = '';
      activeConversationId = null;
    }
  }

  async function loadConversations() {
    try {
      const conversations = await Api.listConversations();
      listEl.innerHTML = '';
      conversations.forEach((c) => {
        const item = document.createElement('div');
        item.className = 'conv-item' + (c.id === activeConversationId ? ' active' : '');
        item.textContent = c.title;
        item.addEventListener('click', () => openConversation(c.id));
        listEl.appendChild(item);
      });
      if (!conversations.length) {
        startNewConversation();
      }
    } catch {
      /* not signed in / network issue — gate already handles messaging */
    }
  }

  async function openConversation(id) {
    activeConversationId = id;
    await loadConversations();
    messagesEl.innerHTML = '';
    try {
      const convo = await Api.getConversation(id);
      convo.messages.forEach((m) => renderMessage(m.role, m.content));
    } catch {
      renderMessage('assistant', "I couldn't load that conversation. Let's start fresh instead.", { error: true });
    }
  }

  function startNewConversation() {
    activeConversationId = null;
    messagesEl.innerHTML = '';
    renderMessage('assistant', "Kumusta! I'm Zimelia. What's on your mind today, Kaito-kun? 🌸");
    loadConversations();
  }

  async function handleSend(e) {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || !signedIn) return;

    renderMessage('user', text);
    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;
    statusEl.textContent = 'typing…';

    const typingBubble = renderTyping();

    try {
      const res = await Api.sendMessage(text, activeConversationId);
      activeConversationId = res.conversationId;
      typingBubble.remove();
      renderMessage('assistant', res.reply, { error: !!res.error });
      loadConversations();
    } catch (err) {
      typingBubble.remove();
      renderMessage('assistant', "Ah... I seem to be having trouble connecting right now. Could you try again in a moment?", { error: true });
    } finally {
      input.disabled = false;
      sendBtn.disabled = false;
      statusEl.textContent = 'online';
      input.focus();
    }
  }

  form.addEventListener('submit', handleSend);
  newChatBtn.addEventListener('click', startNewConversation);

  return { setSignedIn };
})();
