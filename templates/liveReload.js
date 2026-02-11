(() => {
  const WS_URL = _HOT_RELOAD_LINK;
  const SERVER = _SERVER_URL;
  const CSS_PATH = _CSS_PATH;
  const JS_PATH = _JS_PATH;

  const CSS_ID = "sc-css-injected";
  const JS_ID = "sc-js-injected";

  let socket;

  const connect = () => {
    socket = new WebSocket(WS_URL);

    socket.addEventListener("open", () => {
      console.log("[SC] Live reload connected");
    });

    socket.addEventListener("message", (event) => {
      let updated;

      try {
        updated = JSON.parse(event.data);
      } catch {
        return;
      }

      if (!Array.isArray(updated) || updated.length === 0) return;

      const isOnlyCSS = updated.every((file) => file.endsWith(".css"));

      if (isOnlyCSS && CSS_PATH) {
        const link = document.getElementById(CSS_ID);
        if (!link || !link.parentNode) return;

        const next = link.cloneNode(false);
        next.href = `${SERVER}${CSS_PATH}?t=${Date.now()}`;
        next.onload = () => link.remove();

        link.parentNode.insertBefore(next, link.nextSibling);
      } else {
        window.location.reload();
      }
    });

    socket.addEventListener("close", () => {
      setTimeout(connect, 1000);
    });

    socket.addEventListener("error", () => {
      socket.close();
    });
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
  script.type = "module";
  document.body.appendChild(script);

  connect();
})();
