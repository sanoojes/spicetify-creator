import type { Plugin, BuildResult } from "esbuild";
import { transform } from "esbuild";
import { varSlugify } from "@/utils/common";
import { templateFilePath, type TemplateType } from "@/metadata";
import type { BuildCache, OutFiles } from "@/esbuild";
import { createLogger, Logger } from "@/utils/logger";
import { basename, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { replace } from "@/utils/fs";
import type { HMRServer } from "@/dev/server";

type LoaderOptions = {
  name: string;
  version: string;
  type: TemplateType;
  cache: BuildCache;
  logger?: Logger;
  outFiles: OutFiles;
  server?: HMRServer;
  dev?: boolean;
};

export function wrapWithLoader({
  name,
  type,
  version,
  cache,
  outFiles,
  server,
  dev = false,
  logger = createLogger("plugin:wrapWithLoader"),
}: LoaderOptions): Plugin {
  const namespace = "spice_internal__wrap-with-loader";

  return {
    name: namespace,
    setup(build) {
      if (build.initialOptions.write !== false) {
        throw new Error(`[${namespace}] This plugin requires "write: false" in build options.`);
      }

      build.onEnd(async (res: BuildResult) => {
        try {
          if (res.errors.length > 0 || !res.outputFiles) return;

          cache.changed.clear();
          cache.hasChanges = false;

          const filesChanged: string[] = [];

          let bundledCss = "";
          if (!dev && type === "extension") {
            bundledCss = res.outputFiles
              .filter((f) => f.path.endsWith(".css"))
              .map((f) => f.text)
              .join("\n")
              .replace(/\\/g, "\\\\")
              .replace(/`/g, "\\`")
              .replace(/\${/g, "\\${");
          }

          const transformPromises = res.outputFiles.map(async (file) => {
            const isJs = file.path.endsWith(".js");
            const isCss = file.path.endsWith(".css");

            if (!dev && isCss && type === "extension") return;

            let targetName: string;
            if (isJs) {
              targetName = outFiles.js;
            } else if (isCss) {
              targetName = outFiles.css ?? basename(file.path);
            } else {
              targetName = basename(file.path);
            }

            const renamedPath = join(build.initialOptions.outdir || "./dist/", targetName);

            if (!isJs) {
              const previous = cache.files.get(renamedPath);
              const nextBuffer = file.contents;

              const didChange =
                !previous ||
                !previous.contents ||
                Buffer.compare(previous.contents, nextBuffer) !== 0;

              if (!didChange) return;

              cache.files.set(renamedPath, {
                name: targetName,
                contents: nextBuffer,
              });
              cache.changed.add(renamedPath);
              cache.hasChanges = true;
              filesChanged.push(renamedPath);

              return;
            }

            const slug = varSlugify(`${name}_${version}`);

            if (!existsSync(templateFilePath)) {
              logger.error(`Template file not found at: ${templateFilePath}`);
              process.exit(1);
            }

            const minify = build.initialOptions.minify;
            const templateRaw = readFileSync(templateFilePath, "utf-8");

            const { code: transformedTemp } = await transform(templateRaw, {
              minify,
              target: build.initialOptions.target || "es2020",
              loader: "jsx",
              define: {
                __ESBUILD__HAS_CSS: JSON.stringify(type === "extension"),
              },
            });

            const kv = {
              "{{APP_SLUG}}": slug,
              "{{APP_TYPE}}": type,
              "{{APP_ID}}": varSlugify(name),
              "{{APP_VERSION}}": version,
              "{{APP_HASH}}": "",
              '"{{INJECT_START_COMMENT}}"': minify ? "" : "/* --- START OF COMPILED CODE --- */",
              '"{{INJECT_END_COMMENT}}"': minify ? "" : "/* --- END OF COMPILED CODE --- */",
              '"{{INJECTED_JS_HERE}}"': file.text,
              "{{INJECTED_CSS_HERE}}": dev ? "" : bundledCss,
            };

            const template = replace(transformedTemp, kv);
            const nextBuffer = Buffer.from(template);

            const previous = cache.files.get(renamedPath);

            const didChange =
              !previous ||
              !previous.contents ||
              Buffer.compare(previous.contents, nextBuffer) !== 0;

            if (!didChange) return;

            cache.files.set(renamedPath, {
              name: targetName,
              contents: nextBuffer,
            });

            cache.changed.add(renamedPath);
            cache.hasChanges = true;
            filesChanged.push(renamedPath);
          });

          await Promise.all(transformPromises);

          if (filesChanged.length > 0) {
            server?.broadcast(filesChanged);
          }
        } catch (e) {
          logger.error(`Error wrapping: ${e instanceof Error ? e.message : String(e)}`);
        }
      });
    },
  };
}
