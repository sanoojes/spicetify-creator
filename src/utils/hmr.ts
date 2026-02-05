import { resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { transform } from "esbuild";
import { CHECK, CROSS } from "@/constants";
import { env } from "@/env";
import { pc } from "@/utils/common";
import { mkdirp } from "@/utils/fs";
import { getSpicetifyConfig, getExtensionDir, runSpice } from "@/utils/spicetify";
import { liveReloadFilePath } from "@/metadata";
import { logger } from "@/utils/logger";
import type { OutFiles } from "@/esbuild";

export const injectHMRExtension = async (rootLink: string, hmrLink: string, outFiles: OutFiles) => {
  const extName = `sc-live-reload-helper.js`;
  const spiceConfig = await getSpicetifyConfig();

  const cleanup = () => {
    if (env.isDev) logger.log(`[Spicetify] Removing Live reload extension...`);
    try {
      runSpice(["config", "extensions", `${extName}-`]);
      runSpice(["apply"]);
      logger.debug(pc.green(`${CHECK} Cleanup successful.`));
    } catch (e) {
      if (env.isDev) logger.error(pc.red(`${CROSS} Cleanup failed: `), e);
    }
    process.exit();
  };

  if (env.isDev) {
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
  }

  try {
    logger.debug(`[Spicetify] Preparing Live reload extension...`);

    const destDir = getExtensionDir();
    mkdirp(destDir);
    const outDir = resolve(destDir, extName);

    const sourceCode = readFileSync(liveReloadFilePath, "utf8");

    const { code } = await transform(sourceCode, {
      loader: "js",
      define: {
        _SERVER_URL: JSON.stringify(rootLink),
        _HOT_RELOAD_LINK: JSON.stringify(hmrLink),
        _JS_PATH: JSON.stringify(`/files/${outFiles.js}`),
        _CSS_PATH: JSON.stringify(outFiles.css ? `/files/${outFiles.css}` : null),
      },
    });

    writeFileSync(outDir, code);

    if (spiceConfig) {
      runSpice(["config", "extensions", extName]);
      runSpice(["apply"]);
    }

    logger.debug(pc.green(`${CHECK} Live reload extension injected successfully.`));
  } catch (err) {
    logger.error(
      pc.red(
        `${CROSS} Failed to inject HMR helper: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
  }
};
