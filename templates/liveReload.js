(() => {
  const WS_URL = _HOT_RELOAD_LINK;
  const SERVER = _SERVER_URL;
  const CSS_PATH = _CSS_PATH;
  const JS_PATH = _JS_PATH;

  const CSS_ID = "sc-css-injected";
  const JS_ID = "sc-js-injected";
  const STYLES_ID = "sc-devtools-styles";

  const injectStyles = () => {
    if (document.getElementById(STYLES_ID)) return;

    const css = `
/* Animations */
@keyframes scFadeIn { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes scModalFade { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes scBackdropFade { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(8px); } }
@keyframes scPulse { 0% { box-shadow: 0 0 0 0 rgba(30, 215, 96, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(30, 215, 96, 0); } 100% { box-shadow: 0 0 0 0 rgba(30, 215, 96, 0); } }

/* Overlay */
.sc-overlay { position: fixed; bottom: 24px; right: 24px; z-index: 2147483647; font-family: "Circular Sp", "Helvetica Neue", helvetica, arial, sans-serif; font-size: 13px; color: #fff; }

/* Trigger Button */
.sc-trigger { width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #1ed760, #148f3f); color: #fff; border: none; border-radius: 50%; cursor: pointer; box-shadow: 0 8px 24px rgba(30, 215, 96, 0.4); transition: all 0.25s cubic-bezier(0.3, 0, 0.4, 1); animation: scPulse 2s infinite; padding: 0; }
.sc-trigger svg { width: 28px; height: 28px; fill: currentColor; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); transition: transform 0.3s ease; }
.sc-trigger:hover { transform: scale(1.08) translateY(-4px); box-shadow: 0 12px 28px rgba(30, 215, 96, 0.5); }
.sc-trigger:hover svg { scale(1.1); }
.sc-trigger:active { transform: scale(0.95); }

/* Trigger States */
.sc-trigger--error { background: linear-gradient(135deg, #e91429, #a30e1c); box-shadow: 0 8px 24px rgba(233, 20, 41, 0.4); animation: none; }
.sc-trigger--error:hover { box-shadow: 0 12px 28px rgba(233, 20, 41, 0.5); }
.sc-trigger--warning { background: linear-gradient(135deg, #ffa42b, #b36f14); box-shadow: 0 8px 24px rgba(255, 164, 43, 0.4); animation: none; }
.sc-trigger--warning:hover { box-shadow: 0 12px 28px rgba(255, 164, 43, 0.5); }

/* Panel */
.sc-panel { position: absolute; bottom: 76px; right: 0; width: 340px; background-color: rgba(36, 36, 36, 0.85); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-radius: 12px; box-shadow: 0 24px 48px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.08); overflow: hidden; display: none; flex-direction: column; animation: scFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); transform-origin: bottom right; }
.sc-panel--open { display: flex; }
.sc-panel__header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; background-color: rgba(24, 24, 24, 0.5); border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
.sc-panel__title { font-weight: 800; font-size: 15px; margin: 0; color: #fff; letter-spacing: -0.02em; }
.sc-panel__close { background: transparent; border: none; color: #a7a7a7; cursor: pointer; font-size: 16px; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.sc-panel__close:hover { color: #fff; background-color: rgba(255,255,255,0.1); }
.sc-panel__content { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.sc-panel__row { display: flex; align-items: center; justify-content: space-between; padding-bottom: 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
.sc-panel__row:last-of-type { border-bottom: none; padding-bottom: 0; }
.sc-panel__label { color: #a7a7a7; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
.sc-panel__value { color: #fff; font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 10px; }
.sc-panel__value--muted { color: #a7a7a7; font-weight: 500; font-family: Consolas, monospace; font-size: 12px; max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: rgba(0,0,0,0.2); padding: 4px 8px; border-radius: 4px; }

/* Status Dot */
.sc-panel__dot { width: 10px; height: 10px; border-radius: 50%; background-color: #e91429; box-shadow: 0 0 10px rgba(233, 20, 41, 0.6); transition: all 0.3s ease; }
.sc-panel__dot--connected { background-color: #1ed760; box-shadow: 0 0 10px rgba(30, 215, 96, 0.6); }

/* Buttons */
.sc-panel__actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
.sc-btn { padding: 12px 16px; background-color: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.3); border-radius: 32px; cursor: pointer; font-size: 13px; font-weight: 700; transition: all 0.2s cubic-bezier(0.3, 0, 0.4, 1); text-align: center; text-transform: uppercase; letter-spacing: 0.05em; }
.sc-btn:hover { border-color: #fff; transform: scale(1.04); background-color: rgba(255,255,255,0.05); }
.sc-btn:active { transform: scale(0.98); }
.sc-btn--primary { background-color: #fff; color: #000; border: none; }
.sc-btn--primary:hover { background-color: #1ed760; color: #000; border: none; }

/* Modal */
.sc-modal { position: fixed; inset: 0; background-color: rgba(0, 0, 0, 0.8); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 2147483647; padding: 24px; animation: scBackdropFade 0.3s ease-out; font-family: "Circular Sp", sans-serif; }
.sc-modal__inner { width: 100%; max-width: 720px; max-height: 85vh; background-color: #121212; border-radius: 16px; box-shadow: 0 32px 80px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255,255,255,0.08); display: flex; flex-direction: column; overflow: hidden; animation: scModalFade 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.sc-modal__header { padding: 24px; background-color: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(233, 20, 41, 0.3); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
.sc-modal__title { color: #e91429; font-size: 20px; font-weight: 800; margin: 0; display: flex; align-items: center; gap: 12px; letter-spacing: -0.02em; }
.sc-modal__close-btn { background: rgba(255,255,255,0.05); border: none; color: #a7a7a7; cursor: pointer; width: 36px; height: 36px; border-radius: 50%; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.sc-modal__close-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
.sc-modal__content { padding: 0; overflow-y: auto; flex: 1; background-color: #0a0a0a; scrollbar-width: thin; }

/* Error Items */
.sc-err-item { padding: 24px; border-bottom: 1px solid rgba(255,255,255,0.06); transition: background-color 0.2s; }
.sc-err-item:hover { background-color: rgba(255,255,255,0.02); }
.sc-err-item:last-child { border-bottom: none; }
.sc-err-msg { color: #fff; font-weight: 700; margin-bottom: 16px; font-size: 15px; line-height: 1.5; font-family: Consolas, monospace; }
.sc-err-loc { background-color: #000; padding: 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); font-family: Consolas, Monaco, "Courier New", monospace; font-size: 13px; overflow-x: auto; box-shadow: inset 0 2px 8px rgba(0,0,0,0.5); }
.sc-err-path { color: #1ed760; margin-bottom: 10px; font-weight: 700; opacity: 0.9; }
.sc-err-code { color: #a7a7a7; white-space: pre; line-height: 1.6; }
.sc-err-note { color: #a7a7a7; margin-top: 16px; padding-left: 16px; border-left: 3px solid #e91429; font-size: 13px; font-weight: 500; }

.sc-modal__footer { padding: 20px 24px; background-color: rgba(255,255,255,0.02); border-top: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: flex-end; gap: 12px; flex-shrink: 0; }
`;
    const style = document.createElement("style");
    style.id = STYLES_ID;
    style.textContent = css;
    document.head.appendChild(style);
  };

  const createElement = (tag, props = {}, children = []) => {
    const el = document.createElement(tag);
    Object.entries(props).forEach(([key, value]) => {
      if (key === "style") {
        Object.assign(el.style, value);
      } else if (key === "className") {
        el.className = value;
      } else if (key.startsWith("on")) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, value);
      } else {
        el.setAttribute(key, value);
      }
    });
    children.forEach((child) => {
      if (typeof child === "string") {
        el.innerHTML += child;
      } else if (child instanceof Node) {
        el.appendChild(child);
      }
    });
    return el;
  };

  let socket;
  let isConnected = false;
  let hasConnectedOnce = false;
  let reconnectTimeout;
  let isPanelOpen = false;
  let rootEl;
  let triggerBtn;
  let panel;
  let dialogEl;
  let errorContentEl;

  const onClose = () => {
    isConnected = false;
    updateUI();
    clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(connect, 1000);
  };

  const connect = () => {
    socket = new WebSocket(WS_URL);

    socket.addEventListener("open", () => {
      isConnected = true;
      updateUI();
      console.log("[SC] Live reload connected");

      if (hasConnectedOnce) {
        Spicetify.showNotification("Reconnected successfully", false);
      }
      hasConnectedOnce = true;
    });

    socket.addEventListener("message", (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!data) return;

      if (!Array.isArray(data)) {
        if (data.type === "build-error" && data.errors?.length > 0) {
          handleBuildError(data.errors, data.warnings);
          return;
        }
        if (data.type === "build-success") {
          handleBuildSuccess(data.warnings);

          if (Array.isArray(data.updated) && data.updated.length > 0) {
            data = data.updated;
          } else {
            return;
          }
        }
      }

      if (Array.isArray(data) && data.length > 0) {
        const isOnlyCSS = data.every((file) => file.endsWith(".css"));

        if (isOnlyCSS && CSS_PATH) {
          const link = document.getElementById(CSS_ID);
          if (!link || !link.parentNode) return;

          const next = link.cloneNode(false);
          next.href = `${SERVER}${CSS_PATH}?t=${Date.now()}`;
          next.onload = () => {
            link.remove();
            Spicetify.showNotification("Styles hot-reloaded", false);
          };

          link.parentNode.insertBefore(next, link.nextSibling);
        } else {
          window.location.reload();
        }
      }
    });

    socket.addEventListener("close", onClose);

    socket.addEventListener("error", () => {
      isConnected = false;
      updateUI();
    });
  };

  const handleBuildError = (errors) => {
    updateUI(true);
    updateErrorDialog(errors);
  };

  const handleBuildSuccess = (warnings) => {
    updateUI(false);
    hideErrorDialog();
    if (warnings?.length > 0) {
      Spicetify.showNotification(`${warnings.length} warning(s)`, false);
    }
  };

  const renderErrors = (errors) => {
    const fragment = document.createDocumentFragment();
    errors.forEach((error, index) => {
      const errorMsg = error.text || error.message || String(error);
      const loc = error.location;

      const item = createElement("div", { className: "sc-err-item" });
      item.appendChild(
        createElement("div", { className: "sc-err-msg" }, [`${index + 1}. ${errorMsg}`]),
      );

      if (loc) {
        const locEl = createElement("div", { className: "sc-err-loc" });
        locEl.appendChild(
          createElement("div", { className: "sc-err-path" }, [
            `${loc.file}:${loc.line}:${loc.column}`,
          ]),
        );
        if (loc.lineText) {
          locEl.appendChild(createElement("div", { className: "sc-err-code" }, [loc.lineText]));
        }
        item.appendChild(locEl);
      }

      if (error.notes?.length) {
        error.notes.forEach((note) => {
          item.appendChild(createElement("div", { className: "sc-err-note" }, [note.text]));
        });
      }

      fragment.appendChild(item);
    });
    return fragment;
  };

  const updateErrorDialog = (errors) => {
    if (!dialogEl) {
      dialogEl = createElement("div", { className: "sc-modal" });
      const inner = createElement("div", { className: "sc-modal__inner" });

      const header = createElement("div", { className: "sc-modal__header" }, [
        createElement("h2", { className: "sc-modal__title" }, [
          createElement("span", {}, ["⚠️"]),
          createElement("span", {}, ["Build Error"]),
        ]),
        createElement("button", { className: "sc-modal__close-btn", onClick: hideErrorDialog }, [
          `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-icon lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
        ]),
      ]);

      errorContentEl = createElement("div", { className: "sc-modal__content" });

      const footer = createElement("div", { className: "sc-modal__footer" }, [
        createElement("button", { className: "sc-btn", onClick: hideErrorDialog }, ["Dismiss"]),
      ]);

      inner.appendChild(header);
      inner.appendChild(errorContentEl);
      inner.appendChild(footer);
      dialogEl.appendChild(inner);
      document.body.appendChild(dialogEl);
    }

    dialogEl.style.display = "flex";
    errorContentEl.innerHTML = "";
    errorContentEl.appendChild(renderErrors(errors));
  };

  const hideErrorDialog = () => {
    if (dialogEl) dialogEl.style.display = "none";
  };

  const updateUI = (hasError = false) => {
    if (!triggerBtn || !panel) return;

    triggerBtn.className = "sc-trigger";
    if (hasError) triggerBtn.classList.add("sc-trigger--error");
    else if (!isConnected) triggerBtn.classList.add("sc-trigger--warning");

    const statusDot = panel.querySelector(".sc-panel__dot");
    if (statusDot) {
      statusDot.className = "sc-panel__dot";
      if (isConnected) statusDot.classList.add("sc-panel__dot--connected");
    }

    const statusText = panel.querySelector(".sc-status-text");
    if (statusText)
      statusText.textContent = hasError
        ? "Build Failed"
        : isConnected
          ? "Connected"
          : "Disconnected";

    const buildStatusText = panel.querySelector(".sc-build-status");
    if (buildStatusText) {
      buildStatusText.textContent = hasError ? "Failed" : "Ready";
      buildStatusText.style.color = hasError ? "#f15e6c" : "#b3b3b3";
    }
  };

  const togglePanel = () => {
    isPanelOpen = !isPanelOpen;
    panel.classList.toggle("sc-panel--open", isPanelOpen);
  };

  const reload = () => window.location.reload();

  const init = () => {
    injectStyles();

    rootEl = createElement("div", { className: "sc-overlay" });

    triggerBtn = createElement(
      "button",
      {
        className: "sc-trigger",
        title: "Spicetify Creator DevTools",
      },
      [
        createElement("span", {}, [
          `<svg xmlns="http://www.w3.org/2000/svg" version="1.0" width="22px" height="22px" viewBox="0 0 320.000000 400.000000"><g transform="translate(0.000000,400.000000) scale(0.100000,-0.100000)" fill="currentColor"><path d="M2213 3833 c3 -10 18 -52 34 -93 25 -67 28 -88 28 -200 0 -113 -3 -131 -27 -188 -87 -207 -222 -340 -613 -602 -206 -139 -308 -223 -442 -364 -117 -124 -133 -129 -146 -51 -28 173 -52 229 -130 307 -69 69 -133 101 -214 106 -80 5 -113 -3 -113 -28 0 -13 14 -25 43 -38 63 -28 113 -76 144 -140 25 -51 28 -68 28 -152 -1 -141 -27 -221 -193 -600 -133 -305 -164 -459 -138 -685 20 -168 46 -268 101 -382 127 -262 351 -451 642 -540 81 -24 102 -27 268 -27 159 -1 190 2 265 22 172 47 315 129 447 255 164 157 251 322 304 572 26 124 31 308 15 585 -7 130 -6 168 8 240 42 211 148 335 316 371 38 8 50 15 50 29 0 23 -27 30 -120 30 -101 0 -183 -22 -250 -68 -52 -36 -71 -58 -163 -203 -46 -73 -90 -96 -141 -75 -41 17 -51 43 -44 118 4 39 29 97 106 248 198 388 264 606 264 880 0 200 -37 347 -123 492 -53 91 -156 198 -188 198 -18 0 -22 -4 -18 -17z m-591 -2208 c277 -37 576 -148 608 -226 25 -59 -20 -129 -82 -129 -15 0 -61 16 -101 36 -133 67 -288 111 -480 135 -131 16 -447 7 -542 -16 -38 -10 -95 -19 -125 -22 -46 -4 -59 -1 -77 16 -41 38 -42 102 -4 140 33 33 270 78 441 84 109 4 249 -4 362 -18z m-40 -354 c142 -25 276 -68 397 -129 76 -38 97 -53 107 -79 23 -53 -8 -103 -63 -103 -19 0 -67 17 -111 39 -92 46 -203 84 -315 108 -128 28 -450 25 -573 -5 -68 -17 -97 -20 -117 -13 -47 18 -62 80 -29 120 55 69 457 104 704 62z m-48 -326 c183 -28 418 -126 432 -181 7 -29 -16 -69 -45 -77 -12 -3 -62 15 -123 43 -175 82 -240 95 -468 95 -149 0 -214 -4 -274 -18 -43 -9 -87 -17 -97 -17 -27 0 -59 35 -59 64 0 50 47 67 280 100 67 9 266 4 354 -9z"/></g></svg>`,
        ]),
      ],
    );

    panel = createElement("div", { className: "sc-panel" });

    panel.innerHTML = `
<div class="sc-panel__header">
  <h3 class="sc-panel__title">Spicetify DevTools</h3>
  <button class="sc-panel__close" title="Close Panel"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-icon lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
</div>
<div class="sc-panel__content">
  <div class="sc-panel__row">
    <span class="sc-panel__label">Status</span>
    <span class="sc-panel__value"><span class="sc-panel__dot"></span><span class="sc-status-text">Connecting...</span></span>
  </div>
  <div class="sc-panel__row">
    <span class="sc-panel__label">Build</span>
    <span class="sc-panel__value sc-build-status">Ready</span>
  </div>
  <div class="sc-panel__row">
    <span class="sc-panel__label">JS Path</span>
    <span class="sc-panel__value sc-panel__value--muted" title="${JS_PATH}">${JS_PATH || "N/A"}</span>
  </div>
  <div class="sc-panel__row">
    <span class="sc-panel__label">CSS Path</span>
    <span class="sc-panel__value sc-panel__value--muted" title="${CSS_PATH}">${CSS_PATH || "N/A"}</span>
  </div>
  <div class="sc-panel__actions">
    <button class="sc-btn sc-btn--primary" id="sc-reload-btn">Reload</button>
    <button class="sc-btn" id="sc-reconnect-btn">Reconnect</button>
  </div>
</div>`;

    panel.querySelector(".sc-panel__close").addEventListener("click", togglePanel);
    panel.querySelector("#sc-reload-btn").addEventListener("click", reload);
    panel.querySelector("#sc-reconnect-btn").addEventListener("click", () => {
      Spicetify.showNotification("Reconnecting...", false);
      if (socket) {
        socket.removeEventListener("close", onClose);
        socket.close();
      }
      clearTimeout(reconnectTimeout);
      connect();
    });

    triggerBtn.addEventListener("click", togglePanel);

    rootEl.appendChild(panel);
    rootEl.appendChild(triggerBtn);
    document.body.appendChild(rootEl);

    updateUI();
  };

  if (CSS_PATH) {
    const link = document.createElement("link");
    link.id = CSS_ID;
    link.rel = "stylesheet";
    link.href = SERVER + CSS_PATH;
    document.head.appendChild(link);
  }

  const script = document.createElement("script");
  script.id = JS_ID;
  script.src = SERVER + JS_PATH;
  script.onerror = () => {
    updateUI(true);
    updateErrorDialog([{ text: "Failed to load JavaScript. Ensure the dev server is running." }]);
  };
  document.body.appendChild(script);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      init();
      connect();
    });
  } else {
    init();
    connect();
  }
})();
