import * as v from "valibot";
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { watchConfig } from "c12";
import { globSync } from "tinyglobby";
import { type Config, type FileConfig, OptionsSchema } from "@/config/schema";
import { getPackageManager } from "@/utils/package-manager";
import { pc, urlSlugify, varSlugify } from "@/utils/common";
import { createLogger } from "@/utils/logger";
import { runSpice } from "@/utils/spicetify";
import { ENTRY_MAP, ICON_ACTIVE_GLOBS, ICON_GLOBS, type EntryType } from "@/config/globs";

const logger = createLogger("config");

let previousConfig: Config | undefined;
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
    if (isUpdate && previousConfig) {
      await cleanupSpicetifyConfig();
    }
    if (typeof cleanup === "function") {
      await cleanup();
    }
    cleanup = await cb(config, isUpdate);
    previousConfig = config;
  };

  const watcher = await watchConfig<FileConfig>({
    name: "spice",
    defaults: CONFIG_DEFAULTS,
    configFileRequired: true,
    packageJson: true,
    async onUpdate({ oldConfig, newConfig }) {
      try {
        logger.debug("Config update triggered", { oldConfig, newConfig });
        const resolved = await getResolvedConfig(newConfig.config as FileConfig, {
          exitOnError: false,
        });
        logger.debug("Resolved config", { resolved });
        try {
          await runCb(resolved, true);
        } catch (error) {
          logger.error(error);
        }
      } catch (err) {
        logger.error(pc.red("Config validation failed, keeping previous configuration"));
        if (err instanceof Error) {
          logger.error(pc.dim(" └─ ") + err.message);
        }
      }
    },
  });

  const initialConfig = await getResolvedConfig(watcher.config);
  await runCb(initialConfig, false);

  return watcher;
}

export async function getResolvedConfig(
  config: FileConfig,
  { exitOnError = true }: { exitOnError?: boolean } = {},
): Promise<Config> {
  const resolvedContext = await resolveContext(config);
  const result = v.safeParse(OptionsSchema, resolvedContext);

  if (result.success) return result.output;

  logger.error(pc.red("Failed to load configuration:"));
  result.issues.forEach((issue) => {
    const path = issue.path?.map((p) => p.key).join(".") || "input";
    logger.error(`${pc.dim(" └─")} ${pc.yellow(path)}: ${pc.white(issue.message)}`);
  });

  if (exitOnError) {
    process.exit(1);
  }
  throw new Error("Invalid configuration");
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

  if (config.template === "extension") {
    config.cssId ??= `${varSlugify(getEnName(config.name!))}_styles`;
  }

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
      return matches[0];
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
      return matches[0];
    }
  }
  return "";
}
export const getEnName = (configName: Config["name"]) =>
  typeof configName === "string" ? configName : configName.en;

function getSpiceIdentifier(config: Config): string {
  if (config.template === "extension") {
    return `${urlSlugify(config.name)}.js`;
  }
  if (config.template === "custom-app") {
    return urlSlugify(getEnName(config.name));
  }
  return urlSlugify(getEnName(config.name));
}

function getSpiceVarName(template: Config["template"]): string {
  if (template === "extension") return "extensions";
  if (template === "custom-app") return "custom_apps";
  return "current_theme";
}

async function cleanupSpicetifyConfig() {
  if (!previousConfig) return;

  const prevIdentifier = getSpiceIdentifier(previousConfig);
  const varName = getSpiceVarName(previousConfig.template);

  logger.debug(`Cleaning up previous spicetify config: ${varName} ${prevIdentifier}-`);
  runSpice(["config", varName, `${prevIdentifier}-`]);
  runSpice(["apply"]);
}
