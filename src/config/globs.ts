export const JS_EXTENSIONS = "{ts,tsx,js,jsx,mts,mjs,cts,cjs}";
export const CSS_EXTENSIONS = "{css,scss,sass,less,styl,stylus,pcss,postcss}";

const withSrc = (dirs: string[]) => dirs.flatMap((dir) => [dir, `src/${dir}`]);
const createGlobs = (names: string[], dirs: string[], ext: string) =>
  names.flatMap((name) => dirs.map((dir) => `${dir}${name}.${ext}`));

const JS_ENTRY_GLOBS = createGlobs(["app", "index"], withSrc([""]), JS_EXTENSIONS);

const JS_EXTENSION_ENTRY_GLOBS = createGlobs(
  ["app", "index"],
  withSrc(["extension/"]),
  JS_EXTENSIONS,
);

const CSS_ENTRY_GLOBS = createGlobs(["app"], withSrc(["", "styles/", "css/"]), CSS_EXTENSIONS);

export const ICON_GLOBS = createGlobs(["icon", "logo"], withSrc(["", "icons/", "assets/"]), "svg");
export const ICON_ACTIVE_GLOBS = createGlobs(
  ["icon-active", "logo-active"],
  withSrc(["", "icons/", "assets/"]),
  "svg",
);

export type EntryType = "js" | "css" | "js-app-only" | "js-extension-only";

export const ENTRY_MAP: Record<EntryType, string[]> = {
  js: [...JS_ENTRY_GLOBS, ...JS_EXTENSION_ENTRY_GLOBS],
  css: CSS_ENTRY_GLOBS,
  "js-app-only": JS_ENTRY_GLOBS,
  "js-extension-only": JS_EXTENSION_ENTRY_GLOBS,
};
