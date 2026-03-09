import { buildLogger } from "@/esbuild/plugins/buildLogger";
import { buildErrorReporter } from "@/esbuild/plugins/buildErrorReporter";
import { clean } from "@/esbuild/plugins/clean";
import { css } from "@/esbuild/plugins/css";
import { externalGlobal } from "@/esbuild/plugins/externalGlobal";
import { spicetifyHandler } from "@/esbuild/plugins/spicetifyHandlers";
import { wrapWithLoader } from "@/esbuild/plugins/wrapWithLoader";

export const plugins = {
  css,
  clean,
  buildLogger,
  buildErrorReporter,
  externalGlobal,
  wrapWithLoader,
  spicetifyHandler,
};

export default plugins;
