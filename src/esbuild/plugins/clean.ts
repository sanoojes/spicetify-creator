import type { Plugin } from "esbuild";
import fs from "node:fs";
import { resolve } from "node:path";
import type { BuildCache } from "@/esbuild";
import { createLogger } from "@/utils/logger";

export const clean = (cache?: BuildCache, logger = createLogger("plugin:clean")): Plugin => ({
  name: "clean",
  setup(build) {
    const outdir = resolve(build.initialOptions.outdir || "./dist");

    build.onStart(() => {
      if (fs.existsSync(outdir)) {
        try {
          fs.rmSync(outdir, { recursive: true, force: true });
          logger.log(`Removed: ${outdir}`);
        } catch (err) {
          logger.error(`Error removing ${outdir}:`, err);
        }
      }
    });
  },
});
