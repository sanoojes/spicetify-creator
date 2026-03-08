import { resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { transform } from "esbuild";
import { CHECK, CROSS } from "@/constants";
import { pc, urlSlugify } from "@/utils/common";
import { mkdirp } from "@/utils/fs";
import { getSpicetifyConfig, getExtensionDir, getCustomAppsDir, runSpice } from "@/utils/spicetify";
import { liveReloadFilePath } from "@/metadata";
import { logger } from "@/utils/logger";
import type { OutFiles } from "@/esbuild";
import type { Config } from "@/config/schema";
import { getEnName } from "@/config";

export const injectHMRExtension = async (rootLink: string, wsLink: string, outFiles: OutFiles) => {
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

    const indexCode = `const React = Spicetify.React;
const waitForImport = () => {
  return import("${rootLink}/files/${outFiles.js}")
    .then((mod) => mod.default || mod.render)
    .catch((err) => {
      console.error("Failed to import app:", err);
      return null;
    });
};

const AppWrapper = ({ appPromise }) => {
  const [App, setApp] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;

    appPromise.then((app) => {
      if (mounted && app) {
        setApp(() => app);
      }
    });

    return () => {
      mounted = false;
    };
  }, [appPromise]);

  if (!App) {
    return React.createElement(
      "div",
      { className: "loading" },
      "Loading app..."
    );
  }

  return React.createElement(App);
};

const render = () => {
  const appPromise = waitForImport();
  return React.createElement(AppWrapper, { appPromise });
};
`;

    writeFileSync(indexJsPath, indexCode);

    const sourceCode = readFileSync(liveReloadFilePath, "utf8");

    const { code: extensionCode } = await transform(sourceCode, {
      loader: "js",
      define: {
        _SERVER_URL: JSON.stringify(rootLink),
        _HOT_RELOAD_LINK: JSON.stringify(wsLink),
        _JS_PATH: JSON.stringify(`/files/${outFiles.jsExtension ?? "extension.js"}`),
        _CSS_PATH: JSON.stringify(outFiles.css ? `/files/${outFiles.css}` : `/files/app.css`),
      },
    });

    writeFileSync(extensionJsPath, extensionCode);

    const manifestPath = resolve(destDir, "manifest.json");
    const manifest = {
      name: config.name,
      subfiles: [],
      subfiles_extension: [outFiles.jsExtension ?? "extension.js"],
      icon: config.icon.default,
      "active-icon": config.icon.active ?? config.icon.default,
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
