import { resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { transform } from "esbuild";
import { CHECK, CROSS } from "@/constants";
import { pc, urlSlugify } from "@/utils/common";
import { mkdirp } from "@/utils/fs";
import { getSpicetifyConfig, getExtensionDir, getCustomAppsDir, runSpice } from "@/utils/spicetify";
import { liveReloadFilePath, hmrCustomAppFilePath } from "@/metadata";
import { logger } from "@/utils/logger";
import type { OutFiles } from "@/esbuild";
import type { Config } from "@/config/schema";
import { getEnName } from "@/config";

export const injectHMRExtension = async (
  rootLink: string,
  wsLink: string,
  outFiles: OutFiles,
  config: Config,
) => {
  const extName = `sc-live-reload-helper.js`;
  const spiceConfig = await getSpicetifyConfig();

  const cleanup = () => {
    logger.info(`Removing Live reload extension...`);
    try {
      runSpice(["config", "extensions", `${extName}-`]);
      runSpice(["apply"]);
      logger.info(pc.green(`${CHECK} Cleanup successful.`));
    } catch (e) {
      logger.error(pc.red(`${CROSS} Cleanup failed: `), e);
    }
    process.exit();
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  try {
    logger.debug(`Preparing Live reload extension...`);

    const destDir = getExtensionDir();
    mkdirp(destDir);
    const outDir = resolve(destDir, extName);

    const sourceCode = readFileSync(liveReloadFilePath, "utf8");

    const { code } = await transform(sourceCode, {
      loader: "js",
      define: {
        _SERVER_URL: JSON.stringify(rootLink),
        _HOT_RELOAD_LINK: JSON.stringify(wsLink),
        _JS_PATH: JSON.stringify(`/files/${outFiles.js}`),
        _CSS_PATH: JSON.stringify(outFiles.css ? `/files/${outFiles.css}` : `/files/app.css`),
        _REMOVE_CMD: JSON.stringify(
          `spicetify config extensions sc-live-reload-helper.js- && spicetify apply`,
        ),
        _CSS_ID: JSON.stringify(
          config.template === "extension" && config.cssId ? config.cssId : "sc-injected-css",
        ),
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

export const injectHMRCustomApp = async (
  rootLink: string,
  wsLink: string,
  outFiles: OutFiles,
  config: Config,
) => {
  if (config.template !== "custom-app") {
    throw new Error("only supports custom-app templates");
  }

  const identifier = getEnName(config.name);
  const spiceConfig = await getSpicetifyConfig();
  const customAppId = urlSlugify(identifier);

  runSpice(["config", "extensions", "sc-live-reload-helper.js-"]);

  const cleanup = () => {
    logger.info(`Removing Live reload custom-app...`);
    try {
      runSpice(["config", "custom_apps", `${customAppId}-`]);
      runSpice(["apply"]);
      logger.info(pc.green(`${CHECK} Cleanup successful.`));
    } catch (e) {
      logger.error(pc.red(`${CROSS} Cleanup failed: `), e);
    }
    process.exit();
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  try {
    logger.debug(`Preparing Live reload custom-app...`);

    const destDir = resolve(getCustomAppsDir(), customAppId);
    mkdirp(destDir);

    const indexJsPath = resolve(destDir, "index.js");
    const extensionJsPath = resolve(destDir, outFiles.jsExtension ?? "extension.js");

    const hmrCustomAppIndex = readFileSync(hmrCustomAppFilePath, "utf8");
    const { code: transformedIndexCode } = await transform(hmrCustomAppIndex, {
      loader: "js",
      define: {
        _IMPORT_LINK: JSON.stringify(`${rootLink}/files/${outFiles.js}`),
      },
      platform: "browser",
    });

    writeFileSync(indexJsPath, transformedIndexCode);

    const sourceCode = readFileSync(liveReloadFilePath, "utf8");

    const { code: extensionCode } = await transform(sourceCode, {
      loader: "js",
      define: {
        _SERVER_URL: JSON.stringify(rootLink),
        _HOT_RELOAD_LINK: JSON.stringify(wsLink),
        _JS_PATH: JSON.stringify(`/files/${outFiles.jsExtension ?? "extension.js"}`),
        _CSS_PATH: JSON.stringify(outFiles.css ? `/files/${outFiles.css}` : `/files/app.css`),
        _REMOVE_CMD: JSON.stringify(
          `spicetify config custom_apps ${customAppId}- && spicetify apply`,
        ),
      },
    });

    writeFileSync(extensionJsPath, extensionCode);

    const icon = readFileSync(config.icon.default).toString();
    const activeIcon = config.icon.active ? readFileSync(config.icon.active).toString() : icon;
    const manifestPath = resolve(destDir, "manifest.json");
    const manifest = {
      name: config.name,
      subfiles: [],
      subfiles_extension: [outFiles.jsExtension ?? "extension.js"],
      icon,
      activeIcon,
    };
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    if (spiceConfig) {
      runSpice(["config", "custom_apps", customAppId]);
      runSpice(["apply"]);
    }

    logger.debug(pc.green(`${CHECK} Live reload custom-app injected successfully.`));
  } catch (err) {
    logger.error(
      pc.red(
        `${CROSS} Failed to inject HMR custom-app: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
  }
};
