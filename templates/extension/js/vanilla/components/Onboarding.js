export function initOnboarding(config) {
  const overlay = document.createElement("div");
  overlay.className = "onboarding-overlay";

  overlay.innerHTML = `
    <div class="onboarding-card">
      <button class="close-icon-btn" aria-label="Close" id="close-x">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M1 1L11 11M1 11L11 1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>

      <div>
        <span class="status-dot"></span>
        🚀 ${config.projectName} Ready
      </div>

      <div class="config-grid">
        <span class="label">Framework</span>
        <span class="value">${config.framework}</span>

        <span class="label">Language</span>
        <span class="value">${config.language}</span>

        <span class="label">Manager</span>
        <span class="value">${config.packageManager}</span>

        <span class="label">Linter</span>
        <span class="value">${config.linter}</span>
      </div>

      <div class="footer-tip">
        Next Step: Edit <code>src/app.tsx</code>
      </div>
      <div class="onboarding-actions">
      <button class="dismiss-btn" id="dismiss-btn">Dismiss</button>
      <button class="discord-btn" id="discord-btn">Join Discord</button>
      <button class="get-started-btn" id="get-started-btn">Get Started</button>
      </div>
    </div>
  `;

  const dismiss = () => {
    overlay.classList.add("fade-out");
    overlay.addEventListener("transitionend", () => overlay.remove(), {
      once: true,
    });
  };

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) dismiss();
  });

  function openLink(url, newTab = true) {
    if (!url) return;
    if (newTab) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      window.location.href = url;
    }
  }

  const getStarted = () => openLink("{{get-started-link}}");
  const openDiscord = () => openLink("{{discord-link}}");
  overlay.querySelector("#close-x")?.addEventListener("click", dismiss);
  overlay.querySelector("#dismiss-btn")?.addEventListener("click", dismiss);
  overlay.querySelector("#discord-btn")?.addEventListener("click", openDiscord);
  overlay.querySelector("#get-started-btn")?.addEventListener("click", getStarted);

  document.body.prepend(overlay);
}
