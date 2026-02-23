import { createLogger, Logger } from "@/utils/logger";
import postcssMinify from "@csstools/postcss-minify";
import autoprefixer from "autoprefixer";
import type { Plugin } from "esbuild";
import { sassPlugin, postcssModules } from "esbuild-sass-plugin";
import { resolve } from "node:path";

import postcss from "postcss";
import postcssImport from "postcss-import";
import postcssPresetEnv from "postcss-preset-env";

type CSSPlugin = { minify: boolean; inline: boolean; logger: Logger };

export function css({
  minify = false,
  inline = false,
  logger = createLogger("plugin:css"),
}: Partial<CSSPlugin> = {}): Plugin[] {
  const projectRoot = process.cwd();

  const postCssPlugins = [
    postcssImport({ path: [resolve(projectRoot, "src")] }),
    autoprefixer,
    postcssPresetEnv({ stage: 0 }),
    ...(minify ? [postcssMinify()] : []),
  ];

  const type = inline ? "style" : "css";

  return [
    sassPlugin({
      filter: /\.module\.(s[ac]ss|css)$/,
      type,
      transform: postcssModules(
        {
          getJSON: () => {},
          generateScopedName: "[name]__[local]___[hash:base64:5]",
          localsConvention: "camelCaseOnly",
        },
        postCssPlugins,
      ),
    }),

    sassPlugin({
      filter: /\.(s[ac]ss|css)$/,
      type,
      async transform(css, _resolveDir, filePath) {
        const start = performance.now();

        const result = await postcss(postCssPlugins).process(css, {
          from: filePath,
        });

        logger.debug("Global CSS processed", {
          filePath,
          ms: Math.round(performance.now() - start),
        });

        return result.css;
      },
    }),
  ];
}
