(function () {
  var style = document.getElementById(__ESBUILD__STYLE_ID__ || undefined);
  if (!style) {
    style = document.createElement("style");
    style.id = __ESBUILD__STYLE_ID__ || undefined;
    document.head.appendChild(style);
  }
  style.textContent = __ESBUILD__CSS_CONTENT__;
})();
