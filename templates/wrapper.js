(async () => {
  const _ID = `{{APP_SLUG}}-{{APP_TYPE}}`;
  if (!window.SpiceGlobals) window.SpiceGlobals = {}
  window.SpiceGlobals[_ID] = {
    id: "{{APP_ID}}",
    version: "{{APP_VERSION}}",
    hash: "{{APP_HASH}}",
  };
  const _wait = (p, a = 0) => new Promise((res, rej) => {
    const i = setInterval(() => {
      if (p()) return (clearInterval(i), res());
      if (++a > 1000) return (clearInterval(i), rej(new Error("Timeout")));
    }, 50);
  });
  try {
    const S = window.Spicetify;
    if (S.Events?.platformLoaded?.on) await new Promise(r => S.Events.platformLoaded.on(r));
    if (S.Events?.webpackLoaded?.on) await new Promise(r => S.Events.webpackLoaded.on(r));
    await _wait(() => S?.React && S?.ReactJSX && S?.ReactDOM && S?.Platform && S?.Player);
    console.info(`%c[${appId}] %cv${v} %cinitialized`, "color: #1DB954; font-weight: bold", "color: #888", "color: unset");
    "{{INJECT_START_COMMENT}}"
      (async function () {
        "{{INJECTED_JS_HERE}}"
      })();
    "{{INJECT_END_COMMENT}}"
  } catch (err) {
    const msg = err.message === "Timeout" ? `Dependency timeout` : `Crashed`;
    window.Spicetify?.showNotification(`⚠️ ${appId}: ${msg} (check console for more info)`, true);
    console.error(`[${appId}] Error:`, err);
  }
})();