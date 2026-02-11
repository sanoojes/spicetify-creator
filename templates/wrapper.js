__ESBUILD__HAS_CSS &&
  (async () => {
    try {
      const css = `{{INJECTED_CSS_HERE}}`;
      if (css && css.trim().length !== 0) {
        const style = document.createElement("style");
        style.setAttribute("data-app", "{{APP_ID}}");
        style.textContent = css;
        document.head.appendChild(style);
      }
    } catch {}
  })();
(async () => {
  const _ID = `{{APP_SLUG}}-{{APP_TYPE}}`;
  if (!window.SpiceGlobals) window.SpiceGlobals = {};
  window.SpiceGlobals[_ID] = {
    id: "{{APP_ID}}",
    version: "{{APP_VERSION}}",
    hash: "{{APP_HASH}}",
  };
  const { id: appId, version: v } = window.SpiceGlobals[_ID];
  const _wait = (p, a = 0) =>
    new Promise((res, rej) => {
      const i = setInterval(() => {
        if (p()) return (clearInterval(i), res());
        if (++a > 1000) return (clearInterval(i), rej(new Error("Timeout")));
      }, 50);
    });
  try {
    const S = window.Spicetify;
    if (S.Events?.platformLoaded?.on) await new Promise((r) => S.Events.platformLoaded.on(r));
    if (S.Events?.webpackLoaded?.on) await new Promise((r) => S.Events.webpackLoaded.on(r));
    await _wait(() => S?.React && S?.ReactJSX && S?.ReactDOM && S?.Platform && S?.Player);
    // oxfmt-ignore
    console.info(`%c[${appId}] %cv${v} %cinitialized`, "color: #1DB954; font-weight: bold", "color: #888", "color: unset");
    // oxfmt-ignore
    "{{INJECT_START_COMMENT}}"
      (async function () {
        "{{INJECTED_JS_HERE}}";
      })();
    // oxfmt-ignore
    "{{INJECT_END_COMMENT}}"
  } catch (err) {
    const msg = err.message === "Timeout" ? `Dependency timeout` : `Crashed`;
    window.Spicetify?.showNotification(`⚠️ ${appId}: ${msg} (check console for more info)`, true);
    console.error(`[${appId}] Error:`, err);
  }
})();
