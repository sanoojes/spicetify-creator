import { writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import type { Plugin } from "esbuild";
import type { Config } from "@/config/schema";
import { CHECK, CROSS } from "@/constants";
import { pc, urlSlugify } from "@/utils/common";
import { mkdirp } from "@/utils/fs";
import { getExtensionDir, getSpicetifyConfig, getThemesDir, runSpice } from "@/utils/spicetify";
import type { BuildCache } from "@/esbuild";
import { createLogger, type Logger } from "@/utils/logger";

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
  logger = createLogger("plugin:spicetifyHandler"),
}: BuildHandlerOptions): Plugin => ({
  name: "spice_internal__spicetify-build-handler",
  async setup(build) {
    const { apply = true, copy = true, applyOnce = true, remove, outDir = "./dist" } = options;

    let hasAppliedOnce = false;

    const isExtension = config.template === "extension";
    const identifier = isExtension ? `${urlSlugify(config.name)}.js` : urlSlugify(config.name);

    const spiceConfig = await getSpicetifyConfig();
    logger.debug(pc.green("Spicetify Config: "), spiceConfig);

    if (apply) {
      const defaultTheme = spiceConfig.Setting.current_theme;

      build.onStart(async () => {
        if (!spiceConfig) return;

        const spiceIdentifier = remove ? `${identifier}-` : identifier;

        if (isExtension) {
          logger.info(
            pc.yellow(`${remove ? "Removing" : "Adding"} extension: ${pc.bold(identifier)}`),
          );
          runSpice(["config", "extensions", spiceIdentifier]);
        } else {
          const actionLabel = remove ? "Removing theme" : "Setting theme to";
          logger.info(pc.yellow(`${actionLabel}: ${pc.bold(identifier)}`));
          runSpice(["config", "current_theme", spiceIdentifier]);
        }
      });

      if (!isExtension && !remove) {
        const resetTheme = () => {
          logger.info(pc.gray(`Restoring default theme: ${defaultTheme}`));
          runSpice(["config", "current_theme", defaultTheme]);
          process.exit();
        };

        process.once("SIGINT", resetTheme);
        process.once("SIGTERM", resetTheme);
      }
    }

    build.onEnd(async (result) => {
      if (result.errors.length > 0) return;

      const destDirs = [resolve(outDir)];
      if (copy)
        destDirs.push(isExtension ? getExtensionDir() : resolve(getThemesDir(), identifier));

      const tasks = [];

      for (const [filePath, fileData] of cache.files) {
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
        logger.debug(pc.green(`${CHECK} Files copied to Spicetify directory and Dist.`));
      } catch (err) {
        logger.error(
          pc.red(
            `${CROSS} Failed to copy files: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
      }

      const shouldApply = apply && (!applyOnce || !hasAppliedOnce);
      if (shouldApply) {
        logger.info(pc.cyan(`Applying ${config.template} to Spicetify...`));
        const { stderr, status } = runSpice(["apply"]);
        if (status !== 0) {
          logger.error(pc.red(`${CROSS} Spicetify apply failed: ${stderr}`));
        } else {
          logger.info(pc.green(`${CHECK} Spicetify applied successfully!`));
          hasAppliedOnce = true;
        }
      }
    });
  },
});
