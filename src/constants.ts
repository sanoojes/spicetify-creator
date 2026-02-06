import { pc } from "@/utils/common";

export const GITHUB_LINK = "https://github.com/sanoojes/spicetify-creator";
export const DISCORD_LINK = "https://discord.gg/YGkktjdYV8";
// TODO: create docs
export const DOCS_LINK = "https://github.com/sanoojes/spicetify-creator";
export const CONFIG_REF_LINK = "https://github.com/sanoojes/spicetify-creator";
export const SPICETIFY_LINK = "https://spicetify.app/docs/getting-started";

export const CHECK = pc.bold(pc.green("✔"));
export const CROSS = pc.bold(pc.red("✖"));
export const WARN = pc.bold(pc.yellow("⚠"));

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
