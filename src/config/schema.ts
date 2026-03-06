import type { BuildOptions as _ESBuildOptions } from "esbuild";
import * as v from "valibot";
import { frameworkTypes, linterTypes } from "@/metadata";
import { packageManagers } from "@/utils/package-manager";

type EsBuildOmitted = "bundle" | "entryPoints";
export type ESBuildOptions = Omit<_ESBuildOptions, EsBuildOmitted>;

export const ServerConfigSchema = v.object({
  port: v.optional(v.number()),
  serveDir: v.string(),
  hmrPath: v.optional(v.string()),
});

export type HMRServerConfig = v.InferOutput<typeof ServerConfigSchema>;

const EntryFileSchema = v.string();

const AssetEntrySchema = v.object({
  js: EntryFileSchema,
  css: EntryFileSchema,
});

const ExtensionTemplateSchema = v.object({
  template: v.literal("extension"),
  entry: EntryFileSchema,
});

const ThemeTemplateSchema = v.object({
  template: v.literal("theme"),
  entry: AssetEntrySchema,
});

const TemplateSpecificSchema = v.variant("template", [
  ExtensionTemplateSchema,
  ThemeTemplateSchema,
]);

const TemplateSpecificOptionalSchema = v.variant("template", [
  v.partial(ExtensionTemplateSchema),
  v.partial(ThemeTemplateSchema),
]);

const RequiredCommonSchema = v.object({
  name: v.string(),
  outDir: v.string(),
  linter: v.picklist(linterTypes),
  framework: v.picklist(frameworkTypes),
  packageManager: v.picklist(packageManagers),
  esbuildOptions: v.record(v.string(), v.any()) as v.GenericSchema<ESBuildOptions>,
  serverConfig: v.partial(ServerConfigSchema),
  version: v.string(),
});

const OptionalCommonSchema = v.object({
  devModeVarName: v.optional(v.string()),
});

export const FileOptionsSchema = v.intersect([
  v.partial(RequiredCommonSchema),
  OptionalCommonSchema,
  TemplateSpecificOptionalSchema,
]);

export type FileConfig = v.InferOutput<typeof FileOptionsSchema>;

export const OptionsSchema = v.intersect([
  v.required(RequiredCommonSchema),
  OptionalCommonSchema,
  TemplateSpecificSchema,
]);

export type Config = v.InferOutput<typeof OptionsSchema>;
