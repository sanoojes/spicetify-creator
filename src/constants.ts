import { pc } from "@/utils/common";

export const GITHUB_LINK = "https://github.com/sanoojes/spicetify-creator";
export const DISCORD_LINK = "https://discord.gg/YGkktjdYV8";
// TODO: create docs
export const DOCS_LINK = "https://github.com/sanoojes/spicetify-creator";
export const CONFIG_REF_LINK = "https://github.com/sanoojes/spicetify-creator";
export const SPICETIFY_LINK = "https://spicetify.app/docs/getting-started";
export const DEV_MODE_VAR_NAME = `__SPICE_CREATOR_DEV__`;
export const CHECK = pc.bold(pc.green("✔"));
export const CROSS = pc.bold(pc.red("✖"));
export const WARN = pc.bold(pc.yellow("⚠"));

export const SKIP_SPICETIFY = process.env.SPICETIFY_SKIP === "true" || process.env.CI === "true";

export const VALID_PROJECT_FILES = new Set([
  ".DS_Store",
  ".git",
  ".gitattributes",
  ".gitignore",
  ".gitlab-ci.yml",
  ".hg",
  ".hgcheck",
  ".hgignore",
  ".idea",
  ".npmignore",
  ".travis.yml",
  "LICENSE",
  "Thumbs.db",
  "docs",
  "mkdocs.yml",
  "npm-debug.log",
  "yarn-debug.log",
  "yarn-error.log",
  "yarnrc.yml",
  ".yarn",
]);

export const CUSTOM_APP_NAME_LOCALES = [
  "ms",
  "gu",
  "ko",
  "pa-IN",
  "az",
  "ru",
  "uk",
  "nb",
  "sv",
  "sw",
  "ur",
  "bho",
  "pa-PK",
  "te",
  "ro",
  "vi",
  "am",
  "bn",
  "en",
  "id",
  "bg",
  "da",
  "es-419",
  "mr",
  "ml",
  "th",
  "tr",
  "is",
  "fa",
  "or",
  "he",
  "hi",
  "zh-TW",
  "sr",
  "pt-BR",
  "zu",
  "nl",
  "es",
  "lt",
  "ja",
  "st",
  "it",
  "el",
  "pt-PT",
  "kn",
  "de",
  "fr",
  "ne",
  "ar",
  "af",
  "et",
  "pl",
  "ta",
  "sl",
  "pk",
  "hr",
  "sk",
  "fi",
  "lv",
  "fil",
  "fr-CA",
  "cs",
  "zh-CN",
  "hu",
] as const;
