(() => {
  const EVT_SOURCE = _HOT_RELOAD_LINK;
  const SERVER = _SERVER_URL;
  const CSS_PATH = _CSS_PATH;
  const JS_PATH = _JS_PATH;
  const CSS_ID = "sc-css-injected";
  const JS_ID = "sc-js-injected";

  const connect = () => {
    const es = new EventSource(EVT_SOURCE);

    es.addEventListener("change", (e) => {
      const { added, removed, updated } = JSON.parse(e.data);
      console.log(JSON.parse(e.data))

      if (added.length > 0 || removed.length > 0) {
        window.location.reload();
        return;
      }

      const isOnlyCSS = updated.length > 0 && updated.every(file => file.endsWith(".css"));

      if (isOnlyCSS) {
        updated.forEach(file => {
          const link = document.getElementById(CSS_ID);
          if (link) {
            const next = link.cloneNode();
            next.href = `${new URL(file, SERVER).href}?t=${Date.now()}`;
            next.onload = () => link.remove();
            link.parentNode.insertBefore(next, link.nextSibling);
          }
        });
      } else {
        window.location.reload();
      }
    });

    es.onerror = () => {
      es.close();
      window.location.reload();
    };
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
  script.async = true;
  document.body.appendChild(script);

  connect();
})();