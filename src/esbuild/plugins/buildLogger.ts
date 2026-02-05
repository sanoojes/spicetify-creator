import type { Plugin } from "esbuild";
import { CHECK } from "@/constants";
import { formatBuildSummary } from "@/esbuild/format";
import { pc } from "@/utils/common";
import { logger } from "@/utils/logger";
import type { BuildCache } from "@/esbuild";

type LoggerOptions = {
  cache: BuildCache;
};
export const buildLogger = ({ cache }: LoggerOptions): Plugin => ({
  name: "spice_internal__build-logger",
  setup(build) {
    let isFirstBuild = true;
    let buildStartTime: number;

    build.onStart(() => {
      buildStartTime = performance.now();

      if (!isFirstBuild) {
        logger.clear();
        logger.info(pc.dim("Rebuilding..."));
      } else {
        logger.info(pc.dim("Build started..."));
      }
    });

    build.onEnd((result) => {
      if (result.errors.length > 0) {
        logger.info(pc.red("build failed."));
        return;
      }

      const moduleCount = result.metafile ? Object.keys(result.metafile.inputs).length : 0;

      logger.info(`${CHECK} ${moduleCount} modules transformed.`);

      if (result.metafile) {
        const details = formatBuildSummary(cache.files);
        logger.info(details);
      }

      logger.info(pc.green(`${CHECK} built in ${getTime(buildStartTime)}.`));

      isFirstBuild = false;
    });
  },
});

function getTime(start: number) {
  const ms = performance.now() - start;
  return ms > 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
}
