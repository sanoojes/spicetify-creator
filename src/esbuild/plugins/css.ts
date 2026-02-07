import postcssMinify from "@csstools/postcss-minify";
import autoprefixer from "autoprefixer";
import type { Plugin } from "esbuild";
import { sassPlugin, postcssModules } from "esbuild-sass-plugin";
import { resolve } from "node:path";

import postcssImport from "postcss-import";
import postcssPresetEnv from "postcss-preset-env";

type CSSPlugin = { minify: boolean; inline: boolean };

export function css({ minify = false, inline = false }: CSSPlugin): Plugin {
  return sassPlugin({
    type: inline ? "style" : "css",
    transform: postcssModules(
      {
        generateScopedName: "[name]__[local]___[hash:base64:5]",
        localsConvention: "camelCaseOnly",
      },
      [
        postcssImport({ path: [resolve(process.cwd(), "src")] }),
        autoprefixer,
        postcssPresetEnv({ stage: 0 }),
        ...(minify ? [postcssMinify()] : []),
      ],
    ),
  });
}
