// TODO: Automatically check for other entries when it gets deleted
// TODO: Example: if app.tsx moves to src/app.tsx it should restart the config/builder

import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { watchConfig } from "c12";
import { globSync } from "tinyglobby";
import { type Config, type FileConfig, OptionsSchema } from "@/config/schema";
import { getPackageManager } from "@/utils/package-manager";
import { safeParse } from "@/utils/schema";
import { pc } from "@/utils/common";
import { createLogger } from "@/utils/logger";

const logger = createLogger("config");

const JS_ENTRY_GLOBS = [
  "app.{ts,tsx,js,jsx,mts,mjs,cts,cjs}",
  "extension/app.{ts,tsx,js,jsx,mts,mjs,cts,cjs}",
  "src/app.{ts,tsx,js,jsx,mts,mjs,cts,cjs}",
  "src/extension/app.{ts,tsx,js,jsx,mts,mjs,cts,cjs}",
];

const CSS_ENTRY_GLOBS = [
  "app.{css,scss,sass,less,styl,stylus,pcss,postcss}",
  "styles/app.{css,scss,sass,less,styl,stylus,pcss,postcss}",
  "src/app.{css,scss,sass,less,styl,stylus,pcss,postcss}",
  "src/styles/app.{css,scss,sass,less,styl,stylus,pcss,postcss}",
];

const CONFIG_DEFAULTS = {
  outDir: "./dist",
  linter: "biome",
  framework: "react",
  template: "extension",
  packageManager: getPackageManager(),
} as const;

type CleanupFn = () => void | Promise<void>;
type ConfigCallback = (
  config: Config,
  update: boolean,
) => CleanupFn | undefined | Promise<CleanupFn | undefined>;

export async function loadConfig(cb: ConfigCallback) {
  let cleanup: CleanupFn | undefined;

  const runCb = async (config: Config, isUpdate: boolean) => {
    if (typeof cleanup === "function") {
      await cleanup();
    }
    cleanup = await cb(config, isUpdate);
  };

  const watcher = await watchConfig<FileConfig>({
    name: "spice",
    defaults: CONFIG_DEFAULTS,
    configFileRequired: false,
    packageJson: true,
    async onUpdate({ newConfig }) {
      const resolved = await getResolvedConfig(newConfig.config);
      await runCb(resolved, true);
    },
  });

  const initialConfig = await getResolvedConfig(watcher.config);
  await runCb(initialConfig, false);

  return watcher;
}

export async function getResolvedConfig(config: FileConfig): Promise<Config> {
  try {
    const resolvedContext = await resolveContext(config);
    return safeParse(OptionsSchema, resolvedContext, "Config");
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logger.error(pc.red(`Failed to load configuration: ${message}`));
    process.exit(1);
  }
}

async function resolveContext(config: FileConfig): Promise<FileConfig> {
  const cwd = process.cwd();

  const getPkg = () => {
    try {
      return JSON.parse(readFileSync(resolve(cwd, "package.json"), "utf-8"));
    } catch {
      return {};
    }
  };

  const pkg = config.name && config.version ? {} : getPkg();

  if (!config.name) {
    config.name = pkg.name || basename(cwd);
  }

  const DEFAULT_VERSION = "0.0.1";
  if (!config.version) {
    config.version = pkg.version ?? DEFAULT_VERSION;
  }

  if (!config.entry) {
    if (config.template === "theme") {
      config.entry = {
        js: resolveDefaultEntries(cwd, "js"),
        css: resolveDefaultEntries(cwd, "css"),
      };

      // Must have js entry for theme
      if (!config.entry.js || config.entry.js.length === 0) {
        config.entry.js = resolveDefaultEntries(cwd, "js");
      }

      // Must have css entry for theme
      if (!config.entry.css || config.entry.css.length === 0) {
        config.entry.css = resolveDefaultEntries(cwd, "css");
      }
    } else {
      config.entry = resolveDefaultEntries(cwd, "js");
    }
  }

  config.outDir = resolve(cwd, config.outDir || "./dist");

  config.esbuildOptions ??= {};
  config.serverConfig ??= {};

  return config;
}

function resolveDefaultEntries(cwd: string, type: "js" | "css"): string {
  const resolveFile = (globs: string[]): string[] => {
    for (const glob of globs) {
      const matches = globSync(glob, { cwd, absolute: true });
      if (matches.length > 0) return matches;
    }
    return [];
  };

  const globs = type === "js" ? JS_ENTRY_GLOBS : CSS_ENTRY_GLOBS;
  const entries = resolveFile(globs);
  const firstEntry = entries[0];

  if (!firstEntry) {
    throw new Error(
      type === "js"
        ? "No JavaScript entry found (src/app or src/index)."
        : "No CSS entry found (src/app, src/index, or src/styles).",
    );
  }

  return firstEntry;
}
