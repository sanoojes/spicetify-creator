import type { BuildOptions, Plugin } from "esbuild";
import type { Config } from "@/config/schema";
import plugins from "@/esbuild/plugins";
import type { Options as HandlerOpts } from "@/esbuild/plugins/spicetifyHandlers";
import type { HMRServer } from "@/dev/server";
import { urlSlugify } from "@/utils/common";
import { getEnName } from "@/config";

export type OutFiles = {
  js: string;
  css?: string;
  jsExtension?: string;
  manifest?: string;
};

export type File = {
  name: string;
  contents: Uint8Array<ArrayBufferLike>;
  hash?: string;
};

export type BuildCache = {
  files: Map<string, File>;
  changed: Set<string>;
  hasChanges: boolean;
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
    server?: HMRServer;
    dev?: boolean;
  },
): Plugin[] => {
  const { template, minify, cache, buildOptions, outFiles, server, dev } = opts;

  const inline = !dev && template === "extension";
  const p = [
    ...plugins.css({
      minify,
      inline,
    }),

    plugins.externalGlobal({
      react: "Spicetify.React",
      "react-dom": "Spicetify.ReactDOM",
      "react-dom/client": "Spicetify.ReactDOM",
      "react-dom/server": "Spicetify.ReactDOMServer",
      "react/jsx-runtime": "Spicetify.ReactJSX",
    }),

    plugins.wrapWithLoader({
      config: opts,
      cache,
      outFiles,
      server,
      dev,
    }),

    plugins.spicetifyHandler({
      config: opts,
      cache,
      options: buildOptions,
    }),

    plugins.buildLogger({ cache }),
  ];
  if (dev) {
    p.push(plugins.buildErrorReporter({ server }));
  }
  return p;
};

export function getEntryPoints(config: Config) {
  if (config.template === "theme") {
    return [config.entry.js, config.entry.css];
  }

  if (config.template === "custom-app") {
    return [config.entry.app, config.entry.extension];
  }

  return [config.entry];
}

export function getOutFiles(config: Config, isDev = false): OutFiles {
  switch (config.template) {
    case "custom-app":
      return {
        js: "index.js",
        css: "style.css",
        jsExtension: "extension.js",
        manifest: "manifest.json",
      };

    case "extension":
      return {
        js: `${urlSlugify(getEnName(config.name))}.js`,
        css: isDev ? "app.css" : undefined,
      };

    case "theme":
      return {
        js: "theme.js",
        css: "user.css",
      };

    default:
      throw new Error("Unknown template");
  }
}
