import { createHash } from "node:crypto";
import type { Plugin, BuildResult } from "esbuild";
import { transform } from "esbuild";
import { varSlugify } from "@/utils/common";
import type { TemplateType } from "@/metadata";
import type { BuildCache, OutFiles } from "@/esbuild";
import { createLogger, Logger } from "@/utils/logger";
import { basename, join } from "node:path";

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

          for (const file of res.outputFiles) {
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
              continue;
            }

            const currentHash = getHash(file.contents);
            const prevHash = previousHashes.get(file.path);

            if (prevHash === currentHash) {
              continue;
            } else {
              previousHashes.set(file.path, currentHash);
            }

            const jsCode = file.text;
            const slug = varSlugify(`${name}_${version}`);

            const rawWrappedCode = `
(async function() {
  const slug = "${slug}-${type}";
  window.SpiceGlobals = window.SpiceGlobals || {};
  window.SpiceGlobals[slug] = {
    appId: "${varSlugify(name)}",
    version: "${version}",
    hash: "${currentHash}"
  };

  async function ${slug}_main() {
    let attempts = 0;
    const maxAttempts = 1000; 
    const { appId, version } = window.SpiceGlobals[slug];

    while (!window.Spicetify?.showNotification) {
      if (attempts >= maxAttempts) return; 
      attempts++;
      await new Promise(r => setTimeout(r, 50));
    }

    try {
      if (Spicetify?.Events?.platformLoaded?.on) await new Promise(res => Spicetify.Events.platformLoaded.on(res));
      if (Spicetify?.Events?.webpackLoaded?.on) await new Promise(res => Spicetify.Events.webpackLoaded.on(res));

      while (!Spicetify.React || !Spicetify.ReactDOM || !Spicetify.Platform || !Spicetify.Player) {
        if (attempts >= maxAttempts) throw new Error("Dependency timeout");
        attempts++;
        await new Promise(r => setTimeout(r, 50));
      }
    } catch (err) {
      Spicetify.showNotification(\`Error: \${appId} dependencies timed out.\`, true);
      console.error(\`[\${appId}] Setup Error:\`, err);
      return;
    }

    try {
      console.log(\`[\${appId}] [v\${version}] initialized.\`);
      
      /* --- START COMPILED CODE --- */
      ${jsCode}
      /* --- END COMPILED CODE --- */

    } catch (runtimeErr) {
      Spicetify.showNotification(\`Runtime Error: \${appId} crashed.\`, true);
      console.error(\`[\${appId}] Runtime Exception:\`, runtimeErr);
    }
  }

  await ${slug}_main();
})();`.trim();

            // eslint-disable-next-line no-await-in-loop
            const { code } = await transform(rawWrappedCode, {
              minify: build.initialOptions.minify,
              target: build.initialOptions.target || "es2020",
              loader: "js",
            });

            cache.files.set(renamedPath, {
              hash: file.hash,
              name: targetName,
              contents: Buffer.from(code),
            });
          }
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
