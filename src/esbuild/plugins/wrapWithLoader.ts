import { createHash } from "node:crypto";
import type { Plugin, BuildResult } from "esbuild";
import { transform } from "esbuild";
import { varSlugify } from "@/utils/common";
import { templateFilePath, type TemplateType } from "@/metadata";
import type { BuildCache, OutFiles } from "@/esbuild";
import { createLogger, Logger } from "@/utils/logger";
import { basename, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { replace } from "@/utils/fs";

type LoaderOptions = {
  name: string;
  version: string;
  type: TemplateType;
  cache: BuildCache;
  logger?: Logger;
  outFiles: OutFiles;
};

export function wrapWithLoader({
  name,
  type,
  version,
  cache,
  outFiles,
  logger = createLogger("plugin:wrapWithLoader"),
}: LoaderOptions): Plugin {
  const namespace = "spice_internal__wrap-with-loader";
  const previousHashes = new Map<string, string>();

  return {
    name: namespace,
    setup(build) {
      if (build.initialOptions.write !== false) {
        throw new Error(`[${namespace}] This plugin requires "write: false" in  build options.`);
      }

      build.onEnd(async (res: BuildResult) => {
        try {
          if (res.errors.length > 0 || !res.outputFiles) return;

          const transformPromises = res.outputFiles.map(async (file) => {
            const isJs = file.path.endsWith(".js");
            const isCss = file.path.endsWith(".css");

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
              cache.files.set(renamedPath, {
                name: targetName,
                hash: file.hash,
                contents: file.contents,
              });
              return;
            }

            const currentHash = getHash(file.contents);
            const prevHash = previousHashes.get(file.path);

            if (prevHash === currentHash) return;
            previousHashes.set(file.path, currentHash);

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
            });

            const kv = {
              "{{APP_SLUG}}": slug,
              "{{APP_TYPE}}": type,
              "{{APP_ID}}": varSlugify(name),
              "{{APP_VERSION}}": version,
              "{{APP_HASH}}": currentHash,
              '"{{INJECT_START_COMMENT}}"': minify ? "" : "/* --- START OF COMPILED CODE --- */",
              '"{{INJECT_END_COMMENT}}"': minify ? "" : "/* --- END OF COMPILED CODE --- */",
              '"{{INJECTED_JS_HERE}}"': file.text,
            };

            const template = replace(transformedTemp, kv);

            cache.files.set(renamedPath, {
              hash: file.hash,
              name: targetName,
              contents: Buffer.from(template),
            });
          });

          await Promise.all(transformPromises);
        } catch (e) {
          logger.error(`Error wrapping: ${e instanceof Error ? e.message : String(e)}`);
        }
      });
    },
  };
}

function getHash(content: string | Uint8Array): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 8);
}
