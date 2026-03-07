import { resolve } from "node:path";
import { type BuildOptions, context } from "esbuild";
import type { DevCLIOptions } from "@/commands/dev";
import { loadConfig, getEnName } from "@/config";
import type { Config } from "@/config/schema";
import { createHmrServer, type HMRServer } from "@/dev/server";
import {
  defaultBuildOptions,
  getCommonPlugins,
  getEntryPoints,
  getOutFiles,
  type BuildCache,
  type OutFiles,
} from "@/esbuild";
import { pc } from "@/utils/common";
import { logger } from "@/utils/logger";
import { injectHMRExtension, injectHMRCustomApp } from "@/utils/hmr";
import { DEV_MODE_VAR_NAME } from "@/constants";

export const DEFAULT_PORT = 54321;

export const outDir = resolve(`./.spicetify/build/`);
export async function dev(options: DevCLIOptions) {
  logger.clear();
  logger.greeting(pc.green("Starting development environment"));

  let ctx: Awaited<ReturnType<typeof context>> | undefined;
  let server: HMRServer | undefined = undefined;
  loadConfig(async (config, isNewUpdate) => {
    if (isNewUpdate) {
      logger.clear();
      logger.info(pc.green("Config updated, reloading..."));
    }

    try {
      server = await createHmrServer({
        ...config.serverConfig,
        serveDir: config.serverConfig.serveDir ?? outDir,
        port: options.port ?? config.serverConfig.port,
      });
      await server.start();

      const outFiles = getOutFiles(config);

      if (config.template === "custom-app") {
        await injectHMRCustomApp(server.link, server.wsLink, outFiles, config);
      } else {
        await injectHMRExtension(server.link, server.wsLink, outFiles);
      }

      ctx = await context(getJSDevOptions(config, { ...options, outFiles, server }));

      await ctx.watch();

      logger.info(pc.blue("Watching for changes..."));
    } catch (err) {
      logger.error("Failed to start dev server: ", err);
    }

    return async () => {
      try {
        await ctx?.dispose();
        ctx = undefined;

        await server?.stop();
      } finally {
        process.exit();
      }
    };
  });
}
type GetDevOptions = DevCLIOptions & { outFiles: OutFiles; server: HMRServer };
function getJSDevOptions(config: Config, options: GetDevOptions): BuildOptions {
  const entryPoints = getEntryPoints(config);

  const minify = false;

  // to use btw the plugins
  const cache: BuildCache = {
    files: new Map(),
    changed: new Set(),
    hasChanges: true,
  };
  const overrides: BuildOptions = {
    ...defaultBuildOptions,
    outdir: outDir,
    minify,
    sourcemap: "inline",
    external: [
      ...(config.esbuildOptions?.external ? config.esbuildOptions.external : []),
      "react",
      "react-dom",
    ],
    define: {
      [DEV_MODE_VAR_NAME]: "true",
      ...(config.devModeVarName ? { [config.devModeVarName]: "true" } : {}),
      ...config.esbuildOptions.define,
    },
    plugins: [
      ...(config.esbuildOptions?.plugins ? config.esbuildOptions.plugins : []),
      ...getCommonPlugins({
        ...config,
        minify,
        cache,
        buildOptions: {
          copy: true,
          apply: false,
          applyOnce: false,
          remove: config.template !== "custom-app",
          outDir,
        },
        dev: true,
        server: options.server,
        outFiles: options.outFiles,
      }),
    ],
  };

  return {
    entryPoints,
    ...config.esbuildOptions,
    ...overrides,
  };
}
