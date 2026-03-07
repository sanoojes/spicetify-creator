import type { Plugin, BuildResult, OutputFile } from "esbuild";
import { transform, build as esbuild } from "esbuild";
import { varSlugify } from "@/utils/common";
import { templateWrapperFilePath, type TemplateType } from "@/metadata";
import type { BuildCache, OutFiles } from "@/esbuild";
import { createLogger, Logger } from "@/utils/logger";
import { join, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { replace } from "@/utils/fs";
import { createHash } from "node:crypto";
import type { HMRServer } from "@/dev/server";
import type { Config } from "@/config/schema";
import { plugins } from "@/esbuild/plugins";
import { getEnName } from "@/config";

type LoaderOptions = {
  config: Config;
  cache: BuildCache;
  logger?: Logger;
  outFiles: OutFiles;
  server?: HMRServer;
  dev?: boolean;
};

type CustomAppManifest = {
  name: string | Record<string, string>;
  icon: string;
  "active-icon": string;
  subfiles: string[];
  subfiles_extension: string[];
};

export function wrapWithLoader({
  config,
  cache,
  outFiles,
  server,
  dev = false,
  logger = createLogger("plugin:wrapper"),
}: LoaderOptions): Plugin {
  const namespace = "spice_internal__wrap-with-loader";
  const name = typeof config.name === "string" ? config.name : config.name.en;
  const { template: type, version } = config;

  let previousManifestHash: string | undefined;

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

          const outdir = resolve(build.initialOptions.outdir || "./dist");
          const bundledCss = getBundledCss(res.outputFiles, outdir, type, dev);
          const minify = build.initialOptions.minify;
          const slug = varSlugify(`${name}_${version}`);

          const transformPromises = res.outputFiles.map(async (file) => {
            const isJs = file.path.endsWith(".js");
            const isCss = file.path.endsWith(".css");

            if (!dev && isCss && type === "extension") return;

            const relPath = file.path.slice(outdir.length);
            const isCustomAppExtension = type === "custom-app" && isExtensionDir(relPath);

            let targetName: string | undefined;

            if (isJs) {
              targetName = isCustomAppExtension
                ? (outFiles.jsExtension ?? "extension.js")
                : outFiles.js;
            } else if (isCss && !isCustomAppExtension) {
              targetName = outFiles.css;
            }

            if (!targetName) {
              logger.debug("Skipped file: ", file.path);
              return;
            }
            const renamedPath = join(build.initialOptions.outdir || "./dist/", targetName);

            if (type === "custom-app" && targetName === outFiles.js && isJs) {
              const globalName = varSlugify(getEnName(config.name));
              const entryCode = `
import App from "virtual:app";
import React from "react";

export default function render() {
  return <App />;
}
`;

              const result = await esbuild({
                bundle: true,
                write: false,
                minify,
                platform: "browser",
                format: "iife",
                globalName,
                stdin: {
                  contents: entryCode,
                  loader: "tsx",
                  sourcefile: "entry.tsx",
                },
                plugins: [
                  plugins.externalGlobal({
                    react: "Spicetify.React",
                  }),
                  {
                    name: "virtual-modules",
                    setup(vBuild) {
                      vBuild.onResolve({ filter: /^virtual:app$/ }, () => ({
                        path: "app",
                        namespace: "virtual",
                      }));

                      vBuild.onLoad({ filter: /.*/, namespace: "virtual" }, () => ({
                        contents: file.text,
                        loader: "js",
                      }));
                    },
                  },
                ],
              });

              const final = result.outputFiles?.[0];
              if (!final) return;

              let combinedCode = `${final.text}${dev ? `export default () => ${globalName}.default();` : `var render = () => ${globalName}.default();`}\n`;

              cache.files.set(renamedPath, {
                contents: Buffer.from(combinedCode),
                name: targetName,
              });
              cache.changed.add(renamedPath);
              cache.hasChanges = true;
              filesChanged.push(renamedPath);
              return;
            }

            if (!isJs) {
              cache.files.set(renamedPath, { name: targetName, contents: file.contents });
              cache.changed.add(renamedPath);
              cache.hasChanges = true;
              filesChanged.push(renamedPath);
              return;
            }

            const templateRaw = readFileSync(templateWrapperFilePath, "utf-8");

            const { code: transformedTemp } = await transform(templateRaw, {
              minify,
              target: build.initialOptions.target || "es2020",
              loader: "jsx",
              define: {
                __ESBUILD__HAS_CSS: JSON.stringify(type !== "theme"),
                __ESBUILD__INJECTED_CSS: JSON.stringify(bundledCss),
                __ESBUILD__APP_SLUG: JSON.stringify(slug),
                __ESBUILD__APP_TYPE: JSON.stringify(type),
                __ESBUILD__APP_ID: JSON.stringify(varSlugify(name)),
                __ESBUILD__APP_VERSION: JSON.stringify(version),
              },
            });

            const template = replace(transformedTemp, {
              '"{{INJECT_START_COMMENT}}"': minify ? "" : "/* --- START --- */",
              '"{{INJECT_END_COMMENT}}"': minify ? "" : "/* --- END --- */",
              '"{{INJECTED_JS_HERE}}"': file.text,
            });

            const nextBuffer = Buffer.from(template);

            cache.files.set(renamedPath, { name: targetName, contents: nextBuffer });
            cache.changed.add(renamedPath);
            cache.hasChanges = true;
            filesChanged.push(renamedPath);
          });

          await Promise.all(transformPromises);

          if (type === "custom-app") {
            const icon = config.icon;
            const manifestPath = join(outdir, "manifest.json");

            const manifest: CustomAppManifest = {
              name: config.name,
              subfiles: [],
              subfiles_extension: ["extension.js"],
              icon: icon.default,
              "active-icon": icon.active ?? "",
            };

            const manifestString = JSON.stringify(manifest, null, 2);
            const currentHash = createHash("md5").update(manifestString).digest("hex");

            if (currentHash !== previousManifestHash) {
              previousManifestHash = currentHash;

              cache.files.set(manifestPath, {
                contents: Buffer.from(manifestString),
                name: "manifest.json",
              });
              cache.changed.add(manifestPath);
              cache.hasChanges = true;
              filesChanged.push(manifestPath);
            }
          }

          if (filesChanged.length > 0) server?.broadcast(filesChanged);
        } catch (e) {
          logger.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
        }
      });
    },
  };
}

function isExtensionDir(relPath: string): boolean {
  return relPath.startsWith("/extension/") || relPath.startsWith("\\extension\\");
}

function getBundledCss(
  files: OutputFile[],
  outdir: string,
  type: TemplateType,
  dev: boolean,
): string {
  const cssFiles = files.filter((f) => f.path.endsWith(".css"));

  if (!dev && type === "extension") {
    return cssFiles.map((f) => f.text).join("");
  }

  if (type === "custom-app") {
    return cssFiles
      .filter((f) => isExtensionDir(f.path.slice(outdir.length)))
      .map((f) => f.text)
      .join("");
  }

  return "";
}
