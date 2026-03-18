(() => {
  const CONFIG = {
    wsUrl: _HOT_RELOAD_LINK,
    server: _SERVER_URL,
    cssPath: _CSS_PATH,
    jsPath: _JS_PATH,
    removeCmd: _REMOVE_CMD,
    cssId: _CSS_ID || "sc-css-injected",
    jsId: "sc-js-injected",
  };

  const ICONS = {
    close: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
    terminal: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
    copy: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
    check: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
    warning: `⚠️`,
  };

  class SpicetifyDevTools {
    constructor() {
      this.state = {
        isConnected: false,
        hasConnectedOnce: false,
        hasError: false,
      };

      this.socket = null;
      this.reconnectTimeout = null;
      this.shadowRoot = null;
      this.elements = {};
    }

    init() {
      this.setupShadowDOM();
      this.injectUserAssets();
      this.connectWebSocket();
    }

    setupShadowDOM() {
      const hostEl = document.createElement("div");
      hostEl.id = "sc-devtools-root";
      hostEl.style.cssText = "position: absolute; z-index: 2147483647;";
      document.body.appendChild(hostEl);

      this.shadowRoot = hostEl.attachShadow({ mode: "open" });

      const style = document.createElement("style");
      style.textContent = this.getStyles();
      this.shadowRoot.appendChild(style);

      const wrapper = document.createElement("div");
      wrapper.innerHTML = this.getHTMLTemplate();
      this.shadowRoot.appendChild(wrapper);

      this.elements = {
        modal: this.shadowRoot.querySelector(".sc-modal"),
        errorContent: this.shadowRoot.querySelector(".sc-modal__content"),
        btnModalClose: this.shadowRoot.querySelector(".sc-modal__close-btn"),
        copyBtns: this.shadowRoot.querySelectorAll(".sc-remove__copy"),
      };

      this.bindEvents();
    }

    bindEvents() {
      this.elements.btnModalClose.addEventListener("click", () => this.hideErrorDialog());

      this.elements.copyBtns.forEach((btn) => {
        btn.addEventListener("click", () => this.handleCopyCommand(btn));
      });
    }

    connectWebSocket() {
      this.socket = new WebSocket(CONFIG.wsUrl);

      this.socket.addEventListener("open", () => {
        this.setState({ isConnected: true });
        console.log("[SC] Live reload connected");

        if (this.state.hasConnectedOnce) {
          Spicetify.showNotification("Reconnected successfully", false);
        }
        this.setState({ hasConnectedOnce: true });
      });

      this.socket.addEventListener("message", (event) => this.handleMessage(event));
      this.socket.addEventListener("close", () => this.handleDisconnect());
      this.socket.addEventListener("error", () => this.setState({ isConnected: false }));
    }

    handleMessage(event) {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!data) return;

      if (!Array.isArray(data)) {
        if (data.type === "build-error" && data.errors?.length > 0) {
          this.setState({ hasError: true });
          this.showErrorDialog(data.errors);
          return;
        }
        if (data.type === "build-success") {
          this.setState({ hasError: false });
          this.hideErrorDialog();
          if (data.warnings?.length > 0) {
            Spicetify.showNotification(`${data.warnings.length} warning(s)`, false);
          }
          if (Array.isArray(data.updated) && data.updated.length > 0) {
            data = data.updated;
          } else {
            return;
          }
        }
      }

      if (Array.isArray(data) && data.length > 0) {
        const isOnlyCSS = data.every((file) => file.endsWith(".css"));

        if (isOnlyCSS && CONFIG.cssPath) {
          this.hotReloadCSS();
        } else {
          window.location.reload();
        }
      }
    }

    handleDisconnect() {
      this.setState({ isConnected: false });
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = setTimeout(() => this.connectWebSocket(), 1000);
    }

    injectUserAssets() {
      if (CONFIG.cssPath) {
        const link = document.createElement("link");
        link.id = CONFIG.cssId;
        link.rel = "stylesheet";
        link.href = CONFIG.server + CONFIG.cssPath;
        document.head.appendChild(link);
      }
      const script = document.createElement("script");
      script.id = CONFIG.jsId;
      script.src = CONFIG.server + CONFIG.jsPath;
      script.onerror = () => {
        this.setState({ hasError: true });
        this.showErrorDialog([
          { text: "Failed to load JavaScript. Ensure the dev server is running." },
        ]);
      };
      document.body.appendChild(script);
    }

    hotReloadCSS() {
      const oldLink = document.getElementById(CONFIG.cssId);
      if (!oldLink || !oldLink.parentNode) return;

      const newLink = oldLink.cloneNode(false);
      newLink.href = `${CONFIG.server}${CONFIG.cssPath}?t=${Date.now()}`;
      newLink.onload = () => {
        oldLink.remove();
        Spicetify.showNotification("Styles hot-reloaded", false);
      };
      oldLink.parentNode.insertBefore(newLink, oldLink.nextSibling);
    }

    setState(newState) {
      this.state = { ...this.state, ...newState };
    }

    showErrorDialog(errors) {
      this.elements.modal.style.display = "flex";
      this.elements.errorContent.innerHTML = "";

      const fragment = document.createDocumentFragment();

      errors.forEach((err, index) => {
        const msg = err.text || err.message || String(err);
        const item = document.createElement("div");
        item.className = "sc-err-item";

        let html = `<div class="sc-err-msg">${index + 1}. ${msg}</div>`;

        if (err.location) {
          const loc = err.location;
          html += `
            <div class="sc-err-loc">
              <div class="sc-err-path">${loc.file}:${loc.line}:${loc.column}</div>
              ${loc.lineText ? `<div class="sc-err-code">${loc.lineText}</div>` : ""}
            </div>`;
        }

        if (err.notes?.length) {
          err.notes.forEach((note) => {
            html += `<div class="sc-err-note">${note.text}</div>`;
          });
        }

        item.innerHTML = html;
        fragment.appendChild(item);
      });

      this.elements.errorContent.appendChild(fragment);
    }

    hideErrorDialog() {
      this.elements.modal.style.display = "none";
    }

    handleCopyCommand(btnElement) {
      navigator.clipboard.writeText(CONFIG.removeCmd).then(() => {
        btnElement.classList.add("is-copied");
        btnElement.innerHTML = `${ICONS.check} Copied!`;

        setTimeout(() => {
          btnElement.classList.remove("is-copied");
          btnElement.innerHTML = `${ICONS.copy} Copy`;
        }, 2000);
      });
    }

    getHTMLTemplate() {
      const removeSectionHTML = `
<div class="sc-remove">
  <div class="sc-remove__title">${ICONS.terminal} Remove Extension</div>
  <div class="sc-remove__cmd">
    <code>${CONFIG.removeCmd}</code>
    <button class="sc-remove__copy">${ICONS.copy} Copy</button>
  </div>
</div>
`;

      return `
  <div class="sc-modal" style="display: none;">
    <div class="sc-modal__inner">
      <div class="sc-modal__header">
        <h2 class="sc-modal__title"><span>${ICONS.warning}</span><span>Build Error</span></h2>
        <button class="sc-modal__close-btn">${ICONS.close}</button>
      </div>
      <div class="sc-modal__content"></div>
      ${removeSectionHTML}
    </div>
  </div>
`;
    }

    getStyles() {
      return `
/* Variables */
:host {
  --sc-color-bg-modal: #181818;
  --sc-color-bg-elevated: rgba(255, 255, 255, 0.06);
  --sc-color-bg-hover: rgba(255, 255, 255, 0.1);
  --sc-color-text-primary: #ffffff;
  --sc-color-text-secondary: #a7a7a7;
  --sc-color-text-muted: #888888;
  --sc-color-brand: #1ed760;
  --sc-color-error: #e91429;
  --sc-border-light: rgba(255, 255, 255, 0.08);
  --sc-border-error: rgba(233, 20, 41, 0.2);
  --sc-shadow-panel: 0 24px 48px rgba(0, 0, 0, 0.6), 0 0 0 1px var(--sc-border-light);
  --sc-radius-sm: 6px;
  --sc-radius-md: 12px;
  --sc-radius-lg: 16px;
  --sc-radius-circle: 50%;
  --sc-font-sans: "Circular Sp", "Helvetica Neue", Helvetica, Arial, sans-serif;
  --sc-font-mono: Consolas, Monaco, "Courier New", monospace;
  --sc-transition-smooth: all 0.2s ease;
}

/* Animations */
@keyframes scModalEnter { from { opacity: 0; transform: scale(0.96) translateY(15px); } to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes scBackdropFade { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(8px); } }

/* Modal */
.sc-modal { position: fixed; inset: 0; background-color: rgba(0, 0, 0, 0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; padding: 24px; animation: scBackdropFade 0.3s ease-out; font-family: var(--sc-font-sans); }
.sc-modal__inner { width: 100%; max-width: 680px; max-height: 80vh; background-color: var(--sc-color-bg-modal); border-radius: var(--sc-radius-lg); box-shadow: var(--sc-shadow-panel); display: flex; flex-direction: column; overflow: hidden; animation: scModalEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.sc-modal__header { padding: 20px 24px; background: linear-gradient(135deg, rgba(233, 20, 41, 0.12), rgba(233, 20, 41, 0.02)); border-bottom: 1px solid var(--sc-border-error); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
.sc-modal__title { color: #ff6b6b; font-size: 18px; font-weight: 800; margin: 0; display: flex; align-items: center; gap: 10px; letter-spacing: -0.01em; }
.sc-modal__close-btn { background: var(--sc-color-bg-elevated); border: none; color: var(--sc-color-text-secondary); cursor: pointer; width: 32px; height: 32px; border-radius: var(--sc-radius-circle); display: flex; align-items: center; justify-content: center; transition: var(--sc-transition-smooth); }
.sc-modal__close-btn:hover { background: var(--sc-color-bg-hover); color: var(--sc-color-text-primary); }
.sc-modal__content { padding: 0; overflow-y: auto; flex: 1; scrollbar-width: thin; scrollbar-color: var(--sc-color-bg-hover) transparent; }
.sc-modal__content::-webkit-scrollbar { width: 6px; }
.sc-modal__content::-webkit-scrollbar-track { background: transparent; }
.sc-modal__content::-webkit-scrollbar-thumb { background: var(--sc-color-bg-hover); border-radius: 3px; }

/* Error Items */
.sc-err-item { padding: 20px 24px; border-bottom: 1px solid var(--sc-border-light); transition: background-color 0.2s; }
.sc-err-item:hover { background-color: rgba(255, 255, 255, 0.02); }
.sc-err-item:last-child { border-bottom: none; }
.sc-err-msg { color: var(--sc-color-text-primary); font-weight: 600; margin-bottom: 12px; font-size: 14px; line-height: 1.5; font-family: var(--sc-font-mono); }
.sc-err-loc { background-color: rgba(0, 0, 0, 0.3); padding: 14px; border-radius: var(--sc-radius-sm); border: 1px solid var(--sc-border-light); font-family: var(--sc-font-mono); font-size: 12px; overflow-x: auto; }
.sc-err-path { color: var(--sc-color-brand); margin-bottom: 8px; font-weight: 600; opacity: 0.9; }
.sc-err-code { color: var(--sc-color-text-muted); white-space: pre; line-height: 1.5; }
.sc-err-note { color: var(--sc-color-text-secondary); margin-top: 14px; padding-left: 14px; border-left: 2px solid var(--sc-color-error); font-size: 12px; font-weight: 500; }

/* Remove Section */
.sc-remove { padding: 16px 24px; background: linear-gradient(180deg, rgba(233, 20, 41, 0.06), rgba(233, 20, 41, 0.02)); border-top: 1px solid var(--sc-border-error); }
.sc-remove__title { color: #f15e6c; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
.sc-remove__cmd { display: flex; align-items: stretch; background: rgba(0, 0, 0, 0.4); border-radius: var(--sc-radius-sm); border: 1px solid var(--sc-border-light); overflow: hidden; }
.sc-remove__cmd code { flex: 1; padding: 10px 14px; font-family: var(--sc-font-mono); font-size: 12px; color: var(--sc-color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sc-remove__copy { padding: 10px 14px; background: rgba(255, 255, 255, 0.03); border: none; border-left: 1px solid var(--sc-border-light); color: var(--sc-color-text-secondary); cursor: pointer; font-size: 11px; font-weight: 600; transition: var(--sc-transition-smooth); display: flex; align-items: center; gap: 6px; }
.sc-remove__copy:hover { background: var(--sc-color-bg-hover); color: var(--sc-color-text-primary); }
.sc-remove__copy.is-copied { color: var(--sc-color-brand); }`;
    }
  }

  const start = () => {
    const devTools = new SpicetifyDevTools();
    devTools.init();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
