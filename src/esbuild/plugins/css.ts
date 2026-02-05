import { createLogger, type Logger } from "@/utils/logger";
import postcssMinify from "@csstools/postcss-minify";
import autoprefixer from "autoprefixer";
import type { Plugin } from "esbuild";
import { sassPlugin } from "esbuild-sass-plugin";
import { resolve } from "node:path";

import postcss from "postcss";
import postcssImport from "postcss-import";
import postcssPresetEnv from "postcss-preset-env";

type CSSPlugin = { minify: boolean; inline: boolean; logger?: Logger };
export function css({
  minify = false,
  inline = false,
  logger = createLogger("plugin:css"),
}: CSSPlugin): Plugin {
  const postcssPlugins = [autoprefixer, postcssPresetEnv({ stage: 0 })];

  if (minify) {
    postcssPlugins.push(postcssMinify());
    logger.debug("CSS minification enabled");
  }

  return sassPlugin({
    type: inline ? "style" : "css",
    async transform(source, path) {
      const start = performance.now();

      logger.debug("Processing CSS", { path });

      const projectRoot = process.cwd();
      const { css } = await postcss(postcssPlugins)
        .use(
          postcssImport({
            path: [resolve(projectRoot, "src")],
          }),
        )
        .process(source, {
          from: path,
        });

      logger.debug("CSS processed", {
        path,
        ms: Math.round(performance.now() - start),
      });

      return css;
    },
  });
}
