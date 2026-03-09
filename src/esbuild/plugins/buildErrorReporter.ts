import type { Plugin, BuildResult, Message } from "esbuild";
import type { HMRMessage } from "@/dev/server/types";

export type BuildErrorReporterOptions = {
  server?: { broadcast: (data: HMRMessage) => void };
};

export function buildErrorReporter({ server }: BuildErrorReporterOptions): Plugin {
  return {
    name: "spice_internal__build-error-reporter",

    setup(build) {
      build.onEnd(async (result: BuildResult) => {
        const errors = result.errors;
        const warnings = result.warnings;

        if (errors.length === 0) {
          server?.broadcast({
            type: "build-success",
            errors: [],
            warnings: warnings,
          });
          return;
        }

        server?.broadcast({
          type: "build-error",
          errors: errors,
          warnings: warnings,
        });
      });
    },
  };
}
