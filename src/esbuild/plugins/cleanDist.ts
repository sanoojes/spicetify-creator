import { existsSync, rmSync } from "node:fs";
import type { Plugin } from "esbuild";

export const cleanDist = (outDir: string): Plugin => ({
  name: "spice_internal__clean-dist",
  setup(build) {
    build.onStart(() => {
      if (existsSync(outDir)) {
        rmSync(outDir, { recursive: true, force: true });
      }
    });
  },
});
