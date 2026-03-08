import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { watchConfig } from "c12";
import { globSync } from "tinyglobby";
import { type Config, type FileConfig, OptionsSchema } from "@/config/schema";
import { getPackageManager } from "@/utils/package-manager";
import { safeParse } from "@/utils/schema";
import { pc } from "@/utils/common";
import { createLogger } from "@/utils/logger";
import { ENTRY_MAP, ICON_ACTIVE_GLOBS, ICON_GLOBS, type EntryType } from "@/config/globs";

const logger = createLogger("config");

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
    configFileRequired: true,
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

  const pkg = config.name && config.version ? {} : getPackageMeta(cwd);
  config.name ||= pkg.name || basename(cwd);
  config.version ||= pkg.version || "0.0.1";

  config.entry ||= resolveConfigEntries(config.template, cwd);

  config.outDir = resolve(cwd, config.outDir || "./dist");
  config.esbuildOptions ??= {};
  config.serverConfig ??= {};

  if (config.template === "custom-app") {
    config.icon ??= {
      default: resolveDefaultIcon(cwd),
      active: resolveActiveIcon(cwd),
    };
  }

  return config;
}

function getPackageMeta(cwd: string): Record<string, any> {
  try {
    return JSON.parse(readFileSync(resolve(cwd, "package.json"), "utf-8"));
  } catch {
    return {};
  }
}

function resolveConfigEntries(template: string | undefined, cwd: string) {
  if (template === "theme") {
    return {
      js: resolveDefaultEntry(cwd, "js"),
      css: resolveDefaultEntry(cwd, "css"),
    };
  }

  if (template === "custom-app") {
    return {
      app: resolveDefaultEntry(cwd, "js-app-only"),
      extension: resolveDefaultEntry(cwd, "js-extension-only"),
    };
  }

  return resolveDefaultEntry(cwd, "js");
}

function resolveDefaultEntry(cwd: string, type: EntryType): string {
  const globs = ENTRY_MAP[type];

  for (const glob of globs) {
    const matches = globSync(glob, { cwd, absolute: true });
    if (matches.length > 0 && matches[0]) return matches[0];
  }

  const displayType = {
    js: "JavaScript/TypeScript",
    css: "CSS/Stylesheet",
    "js-app-only": "JavaScript/TypeScript (Custom App)",
    "js-extension-only": "JavaScript/TypeScript (Extension)",
  }[type];

  const expectedFiles = globs.map((g) => `  - ${g}`).join("\n");

  throw new Error(
    `No ${displayType} entry file found in your project.\n` +
      `Please create one of the following files:\n${expectedFiles}`,
  );
}

function resolveDefaultIcon(cwd: string): string {
  for (const glob of ICON_GLOBS) {
    const matches = globSync(glob, { cwd, absolute: true });

    if (matches.length > 0 && matches[0]) {
      return readFileSync(matches[0]).toString();
    }
  }

  const expectedFiles = ICON_GLOBS.map((g) => `  - ${g}`).join("\n");

  throw new Error(
    `No icon file found in your project.\n` +
      `Please create one of the following files:\n${expectedFiles}`,
  );
}
function resolveActiveIcon(cwd: string): string {
  for (const glob of ICON_ACTIVE_GLOBS) {
    const matches = globSync(glob, { cwd, absolute: true });

    if (matches.length > 0 && matches[0]) {
      return readFileSync(matches[0]).toString();
    }
  }
  return "";
}
export const getEnName = (configName: Config["name"]) =>
  typeof configName === "string" ? configName : configName.en;
