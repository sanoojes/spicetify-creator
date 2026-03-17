import { writeFile, unlink } from "node:fs/promises";
import { basename, resolve } from "node:path";
import type { Plugin } from "esbuild";
import type { Config } from "@/config/schema";
import { CHECK, CROSS } from "@/constants";
import { pc, urlSlugify } from "@/utils/common";
import { mkdirp } from "@/utils/fs";
import {
  getCustomAppsDir,
  getExtensionDir,
  getSpicetifyConfig,
  getThemesDir,
  runSpice,
} from "@/utils/spicetify";
import type { BuildCache } from "@/esbuild";
import { createLogger, type Logger } from "@/utils/logger";
import { getEnName } from "@/config";
import { env } from "@/env";

export type Options = {
  copy?: boolean;
  apply?: boolean;
  applyOnce?: boolean;
  remove?: boolean;
  outDir: string;
};

export type BuildHandlerOptions = {
  config: Config;
  options: Options;
  cache: BuildCache;
  logger?: Logger;
};

async function removeFile(logger: Logger, targetPath: string): Promise<void> {
  try {
    await unlink(targetPath);
    logger.debug(pc.green(`${CHECK} Removed: ${targetPath}`));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      logger.error(
        pc.red(
          `${CROSS} Failed to remove file: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  }
}

async function copyFiles(
  logger: Logger,
  destDirs: string[],
  cacheFiles: Map<string, { contents: Uint8Array }>,
): Promise<void> {
  const tasks: Promise<void>[] = [];

  for (const filePath of cacheFiles.keys()) {
    const fileData = cacheFiles.get(filePath);
    if (!fileData) continue;

    for (const destDir of destDirs) {
      const targetPath = resolve(destDir, basename(filePath));
      tasks.push(
        (async () => {
          await mkdirp(destDir);
          await writeFile(targetPath, fileData.contents);
        })(),
      );
    }
  }

  await Promise.all(tasks);
}

async function removeDeletedFiles(
  logger: Logger,
  destDirs: string[],
  removedFiles: Set<string>,
): Promise<void> {
  const tasks: Promise<void>[] = [];

  for (const removedPath of removedFiles) {
    for (const destDir of destDirs) {
      const targetPath = resolve(destDir, basename(removedPath));
      tasks.push(removeFile(logger, targetPath));
    }
  }

  await Promise.all(tasks);
}

export const spicetifyHandler = ({
  config,
  options,
  cache,
  logger = createLogger("plugin:spicetify-handler"),
}: BuildHandlerOptions): Plugin => ({
  name: "spice_internal__spicetify-build-handler",

  async setup(build) {
    const { apply = true, copy = true, applyOnce = true, remove, outDir = "./dist" } = options;

    let hasAppliedOnce = false;

    const isExtension = config.template === "extension";
    const isCustomApp = config.template === "custom-app";
    const identifier = isExtension
      ? `${urlSlugify(config.name)}.js`
      : urlSlugify(getEnName(config.name));

    const getDestDirs = (): string[] => {
      const dirs = [resolve(outDir)];
      if (copy) {
        dirs.push(
          isExtension
            ? getExtensionDir()
            : isCustomApp
              ? resolve(getCustomAppsDir(), identifier)
              : resolve(getThemesDir(), identifier),
        );
      }
      return dirs;
    };

    if (env.skipSpicetify) {
      logger.info(pc.yellow("Skipping Spicetify operations..."));
    } else {
      const spiceConfig = await getSpicetifyConfig();
      logger.debug(pc.green("Spicetify Config: "), spiceConfig);

      if (apply) {
        const defaultTheme = spiceConfig?.Setting?.current_theme || "SpicetifyDefault";
        const spiceIdentifier = remove ? `${identifier}-` : identifier;
        const var_name = isExtension ? "extensions" : isCustomApp ? "custom_apps" : "current_theme";

        runSpice(["config", var_name, spiceIdentifier]);

        if (!isExtension && !remove) {
          const cleanup = () => {
            if (isCustomApp) {
              runSpice(["config", "custom_apps", `${identifier}-`]);
            } else {
              runSpice(["config", "current_theme", defaultTheme]);
            }
            process.exit();
          };

          process.once("SIGINT", cleanup);
          process.once("SIGTERM", cleanup);
        }
      }
    }

    build.onEnd(async (result) => {
      if (result.errors.length > 0) return;

      const destDirs = getDestDirs();

      try {
        await copyFiles(logger, destDirs, cache.files);
        logger.debug(pc.green(`${CHECK} Built files written to ${outDir}`));
      } catch (err) {
        logger.error(
          pc.red(
            `${CROSS} Failed to copy files: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
        return;
      }

      if (cache.removed.size > 0) {
        await removeDeletedFiles(logger, destDirs, cache.removed);
        cache.hasChanges = true;
      }

      cache.removed.clear();

      if (env.skipSpicetify) return;

      const shouldApply = apply && cache.hasChanges && (!applyOnce || !hasAppliedOnce);

      if (shouldApply) {
        const { stdout, stderr, status } = runSpice(["apply"]);

        if (status !== 0) {
          logger.error(pc.red(`${CROSS} Spicetify apply failed:`), stdout, stderr);
        } else {
          hasAppliedOnce = true;
        }
      }
    });
  },
});
