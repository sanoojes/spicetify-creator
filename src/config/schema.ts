import type { BuildOptions as _ESBuildOptions } from "esbuild";
import * as v from "valibot";
import { frameworkTypes, linterTypes } from "@/metadata";
import { packageManagers } from "@/utils/package-manager";
import { CUSTOM_APP_NAME_LOCALES } from "@/constants";

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

const CustomAppEntrySchema = v.object({
  extension: EntryFileSchema,
  app: EntryFileSchema,
});

const LocaleNameSchema = v.intersect([
  v.object({
    en: v.string(),
  }),
  v.record(v.picklist(CUSTOM_APP_NAME_LOCALES), v.string()),
]);

const ExtensionTemplateSchema = v.object({
  name: v.string(),
  template: v.literal("extension"),
  entry: EntryFileSchema,
});

const ThemeTemplateSchema = v.object({
  name: v.string(),
  template: v.literal("theme"),
  entry: AssetEntrySchema,
});

const CustomAppTemplateSchema = v.object({
  name: v.union(
    [v.string(), LocaleNameSchema],
    "Name must be a string or a translations object containing the required 'en' locale.",
  ),
  icon: v.object({
    default: v.string(),
    active: v.optional(v.string()),
  }),
  template: v.literal("custom-app"),
  entry: CustomAppEntrySchema,
});

const TemplateSpecificSchema = v.variant("template", [
  ExtensionTemplateSchema,
  ThemeTemplateSchema,
  CustomAppTemplateSchema,
]);

const TemplateSpecificOptionalSchema = v.variant("template", [
  v.partial(ExtensionTemplateSchema),
  v.partial(ThemeTemplateSchema),
  v.partial(CustomAppTemplateSchema),
]);

const RequiredCommonSchema = v.object({
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
