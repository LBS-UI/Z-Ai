// ═══════════════════════════════════════════════════════════════════
// memory.js — the memory management panel (view / edit / delete /
// clear-all), plus the "let Zimelia use memories" toggle.
// ═══════════════════════════════════════════════════════════════════

const ZimeliaMemory = (() => {
  const overlay = document.getElementById('memoryOverlay');
  const listEl = document.getElementById('memoryList');
  const addForm = document.getElementById('memoryAddForm');
  const addInput = document.getElementById('memoryAddInput');
  const enabledToggle = document.getElementById('memoryEnabledToggle');
  const clearAllBtn = document.getElementById('clearAllMemories');
  const openBtn = document.getElementById('openMemoryPanel');
  const closeBtn = document.getElementById('memoryClose');

  function categoryLabel(cat) {
    return { preference: 'Preference', fact: 'Fact', goal: 'Goal', general: 'General' }[cat] || cat;
  }

  function renderMemory(m) {
    const item = document.createElement('div');
    item.className = 'memory-item';
    item.innerHTML = `
      <div>
        <div class="memory-item__text"></div>
        <span class="memory-item__cat">${categoryLabel(m.category)}</span>
      </div>
      <div class="memory-item__actions">
        <button data-action="edit" title="Edit">✏️</button>
        <button data-action="delete" title="Delete">🗑️</button>
      </div>`;
    item.querySelector('.memory-item__text').textContent = m.memory_text;

    item.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      await Api.deleteMemory(m.id);
      load();
    });
    item.querySelector('[data-action="edit"]').addEventListener('click', async () => {
      const updated = prompt('Edit memory:', m.memory_text);
      if (updated === null || !updated.trim()) return;
      await Api.updateMemory(m.id, { memoryText: updated.trim() });
      load();
    });
    return item;
  }

  async function load() {
    listEl.innerHTML = '<p class="memory-empty">Loading…</p>';
    try {
      const memories = await Api.listMemories();
      listEl.innerHTML = '';
      if (!memories.length) {
        listEl.innerHTML = '<p class="memory-empty">Nothing saved yet. Add one below, or just tell Zimelia "remember that…" in chat.</p>';
        return;
      }
      memories.forEach((m) => listEl.appendChild(renderMemory(m)));
    } catch {
      listEl.innerHTML = '<p class="memory-empty">Couldn\'t load memories right now.</p>';
    }

    try {
      const prefs = await Api.getPreferences();
      enabledToggle.checked = !!prefs.memory_enabled;
    } catch { /* not signed in yet */ }
  }

  function open() {
    overlay.classList.add('open');
    load();
  }
  function close() {
    overlay.classList.remove('open');
  }

  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = addInput.value.trim();
    if (!text) return;
    await Api.addMemory(text);
    addInput.value = '';
    load();
  });

  clearAllBtn.addEventListener('click', async () => {
    if (!confirm("Clear everything Zimelia remembers about you? This can't be undone.")) return;
    await Api.clearMemories();
    load();
  });

  enabledToggle.addEventListener('change', async () => {
    await Api.updatePreferences({ memoryEnabled: enabledToggle.checked });
  });

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  return { open, close, load };
})();
