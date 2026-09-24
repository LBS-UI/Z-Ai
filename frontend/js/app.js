// ═══════════════════════════════════════════════════════════════════
// app.js — bootstraps ambient particles and wires auth state to the
// nav bar + chat gate.
// ═══════════════════════════════════════════════════════════════════

(function initParticles() {
  const container = document.getElementById('particles');
  const count = window.innerWidth < 700 ? 12 : 24;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = 3 + Math.random() * 6;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.left = `${Math.random() * 100}vw`;
    p.style.bottom = `-5vh`;
    p.style.animationDuration = `${14 + Math.random() * 16}s`;
    p.style.animationDelay = `${Math.random() * 12}s`;
    container.appendChild(p);
  }
})();

function renderNavAuth(user) {
  const nav = document.getElementById('navAuth');
  if (user) {
    nav.innerHTML = `
      <span style="color:var(--text-dim); font-size:.9rem;">Hi, ${user.displayName || user.display_name}!</span>
      <button class="btn btn--ghost" id="logoutBtn">Sign out</button>
    `;
    document.getElementById('logoutBtn').addEventListener('click', () => ZimeliaAuth.logout());
  } else {
    nav.innerHTML = `
      <button class="btn btn--ghost" data-open-auth="login">Sign in</button>
      <button class="btn btn--primary" data-open-auth="signup">Get started</button>
    `;
    nav.querySelectorAll('[data-open-auth]').forEach((btn) => {
      btn.addEventListener('click', () => ZimeliaAuth.open(btn.dataset.openAuth));
    });
  }
}

document.addEventListener('zimelia:auth-changed', (e) => {
  const user = e.detail.user;
  renderNavAuth(user);
  ZimeliaChat.setSignedIn(!!user);
});

ZimeliaAuth.checkSession();
