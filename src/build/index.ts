import { resolve } from "node:path";
import { type BuildOptions, context } from "esbuild";
import type { BuildCLIOptions } from "@/commands/build";
import { loadConfig } from "@/config";
import type { Config } from "@/config/schema";
import { defaultBuildOptions, getCommonPlugins, type BuildCache } from "@/esbuild";
import { pc, urlSlugify } from "@/utils/common";
import { createLogger } from "@/utils/logger";

const logger = createLogger("build");

export async function build(options: BuildCLIOptions) {
  logger.clear();
  logger.greeting(pc.green("Building for production..."));

  let ctx: Awaited<ReturnType<typeof context>> | undefined;
  await loadConfig(async (config, isNewUpdate) => {
    if (isNewUpdate) {
      logger.clear();
      logger.info(pc.green("Config updated, reloading..."));
    }

    if (ctx) {
      await ctx.dispose();
    }

    ctx = await context(getJSBuildOptions(config, options));

    if (options.watch) {
      logger.info(pc.blue("Watching for changes..."));
      await ctx.watch();
    } else {
      try {
        await ctx.rebuild();
      } catch {
        // logging handled by the plugins
      } finally {
        await ctx.dispose();
        process.exit(0);
      }
    }

    return async () => {
      await ctx?.dispose();
      ctx = undefined;
    };
  });
}

function getJSBuildOptions(config: Config, options: BuildCLIOptions): BuildOptions {
  const entryPoints = (() => {
    if (config.template === "theme") {
      return [config.entry.js, config.entry.css];
    }
    return [config.entry];
  })();

  const minify = options.watch ? false : options.minify;

  const outDir = resolve(config.outDir);

  // to use in the plugins
  const cache: BuildCache = {
    files: new Map(),
    changed: new Set(),
    hasChanges: true,
  };
  const outFiles = {
    js: config.template === "extension" ? `${urlSlugify(config.name)}.js` : "theme.js",
    css: config.template === "theme" ? "user.css" : null,
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
          apply: options.apply,
          copy: options.copy,
          outDir,
          applyOnce: false,
          remove: false,
        },
        outFiles,
      }),
    ],
  };

  return {
    entryPoints,
    ...config.esbuildOptions,
    ...overrides,
  };
}
