import { resolve } from "node:path";
import { type BuildOptions, context } from "esbuild";
import type { DevCLIOptions } from "@/commands/dev";
import { loadConfig } from "@/config";
import type { Config } from "@/config/schema";
import { createHmrServer, type HMRServer } from "@/dev/server";
import { defaultBuildOptions, getCommonPlugins, type BuildCache, type OutFiles } from "@/esbuild";
import { pc, urlSlugify } from "@/utils/common";
import { logger } from "@/utils/logger";
import { injectHMRExtension } from "@/utils/hmr";

export const DEFAULT_PORT = 54321;

export const outDir = resolve(`./.spicetify/build/`);
export async function dev(options: DevCLIOptions) {
  logger.clear();
  logger.greeting(pc.green("Starting development environment"));

  let ctx: Awaited<ReturnType<typeof context>> | undefined;
  let server: HMRServer | undefined;

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

      const outFiles = {
        js: config.template === "extension" ? `${urlSlugify(config.name)}.js` : "theme.js",
        css: config.template === "theme" ? "user.css" : null,
      };

      await injectHMRExtension(server.link, server.hmrLink, outFiles);

      ctx = await context(getJSDevOptions(config, { ...options, outFiles }));

      server.setContext(ctx);

      await server.start();

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
type GetDevOptions = DevCLIOptions & { outFiles: OutFiles };
function getJSDevOptions(config: Config, options: GetDevOptions): BuildOptions {
  const entryPoints = (() => {
    if (config.template === "theme") {
      return [config.entry.js, config.entry.css];
    }
    return [config.entry];
  })();

  const minify = false;

  // to use btw the plugins
  const cache: BuildCache = {
    files: new Map(),
  };

  const overrides: BuildOptions = {
    ...defaultBuildOptions,
    outdir: outDir,
    minify,
    external: [
      ...(config.esbuildOptions?.external ? config.esbuildOptions.external : []),
      "react",
      "react-dom",
    ],
    plugins: [
      ...(config.esbuildOptions?.plugins ? config.esbuildOptions.plugins : []),
      ...getCommonPlugins({
        ...config,
        minify,
        cache,
        buildOptions: {
          copy: true,
          remove: true,
          outDir,
        },
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
