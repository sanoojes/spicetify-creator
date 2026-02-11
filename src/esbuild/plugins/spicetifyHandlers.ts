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

      build.onStart(() => {
        const spiceIdentifier = remove ? `${identifier}-` : identifier;

        if (isExtension) {
          runSpice(["config", "extensions", spiceIdentifier]);
        } else {
          runSpice(["config", "current_theme", spiceIdentifier]);
        }
      });

      if (!isExtension && !remove) {
        const resetTheme = () => {
          runSpice(["config", "current_theme", defaultTheme]);
          process.exit();
        };

        process.once("SIGINT", resetTheme);
        process.once("SIGTERM", resetTheme);
      }
    }

    build.onEnd(async (result) => {
      if (result.errors.length > 0) return;

      if (!cache.hasChanges || cache.changed.size === 0) {
        return;
      }

      const destDirs = [resolve(outDir)];
      if (copy) {
        destDirs.push(isExtension ? getExtensionDir() : resolve(getThemesDir(), identifier));
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
        const { stderr, status } = runSpice(["apply"]);

        if (status !== 0) {
          logger.error(pc.red(`${CROSS} Spicetify apply failed: ${stderr}`));
        } else {
          hasAppliedOnce = true;
        }
      }
    });
  },
});
