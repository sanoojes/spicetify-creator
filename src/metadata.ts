import { readFileSync } from "node:fs";
import { dist } from "@/utils/fs";

export type Metadata<T extends string> = {
  name: T;
  title: string;
  description?: string;
};

export type Options = { value: string; label: string; description: string };
export const toOptions = <T extends string>(metadata: Metadata<T>[]) =>
  metadata.map((m) => ({
    value: m.name,
    label: m.title,
    hint: m.description,
  }));

export type TemplateType = (typeof templateTypes)[number];
export type TemplateMetadata = Metadata<TemplateType>;
export const templateTypes = ["extension", "theme"] as const;
export const templates: TemplateMetadata[] = templateTypes.map((dir) => {
  const meta_file = dist(`templates/${dir}/meta.json`, import.meta.url);
  const { title, description } = JSON.parse(readFileSync(meta_file, "utf8"));

  return {
    name: dir,
    title,
    description,
  };
});
export const templateOptions = toOptions(templates);

export type LinterType = (typeof linterTypes)[number];
export type LinterMetadata = Metadata<LinterType>;
export const linterTypes = ["biome", "eslint", "oxlint", "none"] as const;
export const linterMeta: Record<LinterType, Omit<LinterMetadata, "name">> = {
  oxlint: {
    title: "Oxlint",
    description: "high-performance linter - http://oxc.rs",
  },
  biome: {
    title: "Biome",
    description: "Fast formatter and linter - https://biomejs.dev",
  },
  eslint: {
    title: "ESLint",
    description: "Industry standard, highly extensible - https://eslint.org",
  },
  none: {
    title: "None",
    description: "Skip linting for this project",
  },
};
export const linters: LinterMetadata[] = linterTypes.map((name) => ({
  name,
  ...linterMeta[name],
}));
export const linterOptions = toOptions(linters);

export type LanguageType = (typeof languageTypes)[number];
export type LanguageMetadata = Metadata<LanguageType>;
export const languageTypes = ["ts", "js"] as const;
export const languageMeta: Record<LanguageType, Omit<LanguageMetadata, "name">> = {
  ts: {
    title: "Typescript",
    description: "with types (Recommended)",
  },
  js: {
    title: "Javascript",
    description: "with JSDOC",
  },
};
export const languages: LanguageMetadata[] = languageTypes.map((name) => ({
  name,
  ...languageMeta[name],
}));
export const languageOptions = toOptions(languages);

export type FrameworkType = (typeof frameworkTypes)[number];
export type FrameworkMetadata = Metadata<FrameworkType>;
export const frameworkTypes = ["react", "vanilla"] as const;
export const frameworkMeta: Record<FrameworkType, Omit<FrameworkMetadata, "name">> = {
  react: {
    title: "ReactJS",
    description: "js framework - https://react.dev",
  },
  vanilla: {
    title: "Vanilla",
    description: "ya know it",
  },
};
export const frameworks: FrameworkMetadata[] = frameworkTypes.map((name) => ({
  name,
  ...frameworkMeta[name],
}));
export const frameworkOptions = toOptions(frameworks);

export const liveReloadFilePath = dist(`templates/liveReload.js`, import.meta.url);
