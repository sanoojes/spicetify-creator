import type { Plugin } from "esbuild";
import { transform } from "esbuild";
import { readFileSync } from "node:fs";
import { injectCSSFilePath } from "@/metadata";

export function inlineBundledCss(styleId: string): Plugin {
  return {
    name: "inline-bundled-css",
    setup(build) {
      build.onEnd(async (result) => {
        if (result.errors.length > 0 || !result.outputFiles) {
          return;
        }

        const outputFiles = result.outputFiles;
        const cssFiles = outputFiles.filter((file) => file.path.endsWith(".css"));
        const jsFiles = outputFiles.filter((file) => file.path.endsWith(".js"));

        await Promise.all(
          cssFiles.map(async (cssFile) => {
            const cssContent = cssFile.text;
            const injectTemplate = readFileSync(injectCSSFilePath, "utf-8");
            const { code: injectScript } = await transform(injectTemplate, {
              loader: "js",
              define: {
                __ESBUILD__STYLE_ID__: JSON.stringify(styleId),
                __ESBUILD__CSS_CONTENT__: JSON.stringify(cssContent),
              },
            });
            const jsPath = cssFile.path.replace(/\.css$/, ".js");
            const jsFile = jsFiles.find((file) => file.path === jsPath);

            if (jsFile) {
              const updatedJsText = jsFile.text + injectScript;
              jsFile.contents = new TextEncoder().encode(updatedJsText);

              const cssIndex = outputFiles.indexOf(cssFile);
              if (cssIndex > -1) {
                outputFiles.splice(cssIndex, 1);
              }
            }
          }),
        );
      });
    },
  };
}
