// ═══════════════════════════════════════════════════════════════════
// auth.js — sign-in / sign-up modal behavior.
// ═══════════════════════════════════════════════════════════════════

const ZimeliaAuth = (() => {
  let mode = 'login'; // 'login' | 'signup'
  let currentUser = null;

  const overlay = document.getElementById('authOverlay');
  const form = document.getElementById('authForm');
  const nameInput = document.getElementById('authName');
  const passwordInput = document.getElementById('authPassword');
  const errorEl = document.getElementById('authError');
  const title = document.getElementById('authTitle');
  const submitBtn = document.getElementById('authSubmit');
  const switchPrompt = document.getElementById('authSwitchPrompt');
  const switchBtn = document.getElementById('authSwitchBtn');

  function render() {
    if (mode === 'login') {
      title.textContent = 'Welcome back';
      submitBtn.textContent = 'Sign in';
      switchPrompt.textContent = 'New here?';
      switchBtn.textContent = 'Create an account';
    } else {
      title.textContent = 'Create your account';
      submitBtn.textContent = 'Get started';
      switchPrompt.textContent = 'Already have an account?';
      switchBtn.textContent = 'Sign in';
    }
    errorEl.textContent = '';
  }

  function open(initialMode) {
    mode = initialMode || 'login';
    render();
    overlay.classList.add('open');
    setTimeout(() => nameInput.focus(), 50);
  }

  function close() {
    overlay.classList.remove('open');
    form.reset();
    errorEl.textContent = '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    errorEl.textContent = '';
    submitBtn.disabled = true;
    const displayName = nameInput.value.trim();
    const password = passwordInput.value;

    try {
      const user = mode === 'login' ? await Api.login(displayName, password) : await Api.signup(displayName, password);
      currentUser = user;
      close();
      document.dispatchEvent(new CustomEvent('zimelia:auth-changed', { detail: { user } }));
    } catch (err) {
      errorEl.textContent = err.message || 'Something went wrong.';
    } finally {
      submitBtn.disabled = false;
    }
  }

  async function checkSession() {
    try {
      currentUser = await Api.me();
      document.dispatchEvent(new CustomEvent('zimelia:auth-changed', { detail: { user: currentUser } }));
    } catch {
      currentUser = null;
    }
  }

  async function logout() {
    await Api.logout().catch(() => {});
    currentUser = null;
    document.dispatchEvent(new CustomEvent('zimelia:auth-changed', { detail: { user: null } }));
  }

  document.querySelectorAll('[data-open-auth]').forEach((btn) => {
    btn.addEventListener('click', () => open(btn.dataset.openAuth));
  });
  document.getElementById('authClose').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  switchBtn.addEventListener('click', () => { mode = mode === 'login' ? 'signup' : 'login'; render(); });
  form.addEventListener('submit', handleSubmit);

  return {
    open,
    close,
    logout,
    checkSession,
    get user() { return currentUser; },
  };
})();
