import { writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import type { Plugin } from "esbuild";
import type { Config } from "@/config/schema";
import { CHECK, CROSS, SKIP_SPICETIFY } from "@/constants";
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

    if (SKIP_SPICETIFY) {
      logger.info(pc.yellow("skipping spicetify operations"));

      build.onEnd(async (result) => {
        if (result.errors.length > 0) return;
        if (!cache.hasChanges || cache.changed.size === 0) return;

        const tasks: Promise<void>[] = [];

        for (const filePath of cache.changed) {
          const fileData = cache.files.get(filePath);
          if (!fileData) continue;

          const targetPath = resolve(outDir, basename(filePath));
          tasks.push(
            (async () => {
              await mkdirp(outDir);
              await writeFile(targetPath, fileData.contents);
            })(),
          );
        }

        try {
          await Promise.all(tasks);
          logger.debug(pc.green(`${CHECK} Built files written to ${outDir}`));
        } catch (err) {
          logger.error(
            pc.red(
              `${CROSS} Failed to write files: ${err instanceof Error ? err.message : String(err)}`,
            ),
          );
        }
      });

      return;
    }

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

    build.onEnd(async (result) => {
      if (result.errors.length > 0) return;

      if (!cache.hasChanges || cache.changed.size === 0) {
        return;
      }

      const destDirs = [resolve(outDir)];
      if (copy) {
        destDirs.push(
          isExtension
            ? getExtensionDir()
            : isCustomApp
              ? resolve(getCustomAppsDir(), identifier)
              : resolve(getThemesDir(), identifier),
        );
      }

      const tasks: Promise<void>[] = [];

      for (const filePath of cache.changed) {
        const fileData = cache.files.get(filePath);
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

      try {
        await Promise.all(tasks);
        logger.debug(pc.green(`${CHECK} Changed files copied.`));
      } catch (err) {
        logger.error(
          pc.red(
            `${CROSS} Failed to copy files: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
        return;
      }

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
