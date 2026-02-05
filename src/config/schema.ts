import type { BuildOptions as _ESBuildOptions } from "esbuild";
import * as v from "valibot";
import { frameworkTypes, linterTypes } from "@/metadata";
import { packageManagers } from "@/utils/package-manager";

type EsBuildOmited = "bundle" | "entryPoints";
export type ESBuildOptions = Omit<_ESBuildOptions, EsBuildOmited>;

export const ServerConfigSchema = v.object({
  port: v.optional(v.number()),
  serveDir: v.string(),
  hmrPath: v.optional(v.string()),
});

export type HMRServerConfig = v.InferOutput<typeof ServerConfigSchema>;

const EntryFileSchema = v.string();

const ThemeEntrySchema = v.object({
  js: EntryFileSchema,
  css: EntryFileSchema,
});

const TemplateSpecificOptionalSchema = v.variant("template", [
  v.partial(
    v.object({
      template: v.literal("extension"),
      entry: EntryFileSchema,
    }),
  ),
  v.partial(
    v.object({
      template: v.literal("theme"),
      entry: ThemeEntrySchema,
    }),
  ),
]);

const TemplateSpecificSchema = v.variant("template", [
  v.object({
    template: v.literal("extension"),
    entry: EntryFileSchema,
  }),
  v.object({
    template: v.literal("theme"),
    entry: ThemeEntrySchema,
  }),
]);

const CommonSchema = v.object({
  name: v.string(),
  outDir: v.string(),
  linter: v.picklist(linterTypes),
  framework: v.picklist(frameworkTypes),
  packageManager: v.picklist(packageManagers),
  esbuildOptions: v.record(v.string(), v.any()) as v.GenericSchema<ESBuildOptions>,

  serverConfig: v.partial(ServerConfigSchema),
  version: v.string(),
});

export const FileOptionsSchema = v.intersect([
  v.partial(CommonSchema),
  TemplateSpecificOptionalSchema,
]);

export type FileConfig = v.InferOutput<typeof FileOptionsSchema>;

export const OptionsSchema = v.pipe(
  v.intersect([v.required(CommonSchema), TemplateSpecificSchema]),
  v.check((input) => !!input.name, "Name is required"),
);

export type Config = v.InferOutput<typeof OptionsSchema>;
