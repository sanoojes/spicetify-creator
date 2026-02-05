import { buildLogger } from "@/esbuild/plugins/buildLogger";
import { cleanDist } from "@/esbuild/plugins/cleanDist";
import { css } from "@/esbuild/plugins/css";
import { externalGlobal } from "@/esbuild/plugins/externalGlobal";
import { spicetifyHandler } from "@/esbuild/plugins/spicetifyHandlers";
import { wrapWithLoader } from "@/esbuild/plugins/wrapWithLoader";

export const plugins = {
  css,
  cleanDist,
  buildLogger,
  externalGlobal,
  wrapWithLoader,
  spicetifyHandler,
};

export default plugins;
