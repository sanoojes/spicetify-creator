import type { BuildOptions, Plugin } from "esbuild";
import type { Config } from "@/config/schema";
import plugins from "@/esbuild/plugins";
import type { Options as HandlerOpts } from "@/esbuild/plugins/spicetifyHandlers";

export type OutFiles = {
  js: string;
  css: string | null;
};

export type File = {
  hash: string;
  name: string;
  contents: Uint8Array<ArrayBufferLike>;
};

export type BuildCache = {
  files: Map<string, File>;
};

export const defaultBuildOptions: Partial<BuildOptions> = {
  bundle: true,
  write: false,
  metafile: true,
  treeShaking: true,
  jsx: "transform",
  format: "esm",
  platform: "browser",
  target: ["es2022", "chrome120"],
};

export const getCommonPlugins = (
  opts: Config & {
    minify: boolean;
    cache: BuildCache;
    buildOptions: HandlerOpts;
    outFiles: OutFiles;
  },
): Plugin[] => {
  const { template, minify, cache, name, version, buildOptions, outFiles } = opts;

  const isExtension = template === "extension";

  return [
    plugins.css({
      minify,
      inline: isExtension,
    }),

    plugins.externalGlobal({
      react: "Spicetify.React",
      "react-dom": "Spicetify.ReactDOM",
      "react-dom/client": "Spicetify.ReactDOM",
      "react-dom/server": "Spicetify.ReactDOMServer",
      "react/jsx-runtime": "Spicetify.ReactJSX",
    }),

    plugins.wrapWithLoader({
      name,
      version,
      type: template,
      cache,
      outFiles,
    }),

    plugins.spicetifyHandler({
      config: opts,
      cache,
      options: buildOptions,
    }),

    plugins.buildLogger({ cache }),
  ];
};
