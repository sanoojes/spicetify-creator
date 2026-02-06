import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { log } from "@clack/prompts";
import { CONFIG_REF_LINK, DOCS_LINK, GITHUB_LINK, DISCORD_LINK, SPICETIFY_LINK } from "@/constants";
import type { Options } from "@/create";
import type { FileAction, FileMapping, FileRegistry, FileSlice } from "@/create/types/file";
import { dist, mkdirp, replace } from "@/utils/fs";

const ext = (lang: Options["language"]) => (lang === "ts" ? "ts" : "js");

// TODO: split kv for required files
const kv = ({ name, language, framework, linter, packageManager, template }: Options) => ({
  "{{project-name}}": name,
  "{{framework}}": framework,
  "{{linter}}": linter,
  "{{package-manager}}": packageManager,
  "{{template}}": template,
  "{{language}}": ext(language),
  "{{entry-ext}}": `${ext(language)}${framework === "react" ? "x" : ""}`,
  "{{docs-link}}": DOCS_LINK,
  "{{get-started-link}}": DOCS_LINK,
  "{{discord-link}}": DISCORD_LINK,
  "{{github-link}}": GITHUB_LINK,
  "{{spicetify-link}}": SPICETIFY_LINK,
  "{{config-reference-link}}": CONFIG_REF_LINK,
});

const action: FileAction = {
  modify(c, opts) {
    return replace(c, kv(opts));
  },
};

export const COMMON_FILES: FileSlice = (opts) => [
  {
    from: "README.template.md",
    to: "README.md",
    action,
    isShared: true,
  },
  { from: ".gitignore", to: ".gitignore", isShared: true },
  {
    from: `spice.config.${ext(opts.language)}`,
    to: `spice.config.${ext(opts.language)}`,
    action,
    isShared: true,
  },
  {
    from: "app.css",
    to: "src/app.css",
    action,
    isShared: true,
  },
];

export const LANGUAGE_FILES: FileRegistry<Options["language"]> = {
  js: [{ from: "jsconfig.json", to: "jsconfig.json", isShared: true }],
  ts: [{ from: "tsconfig.json", to: "tsconfig.json", isShared: true }],
};

export const FRAMEWORKS: FileRegistry<Options["framework"]> = {
  react: ({ language }) => [{ from: `src/app.${ext(language)}x`, to: `src/app.${ext(language)}x` }],
  vanilla: ({ language }) => [{ from: `src/app.${ext(language)}`, to: `src/app.${ext(language)}` }],
};

export const LINTERS: FileRegistry<Options["linter"]> = {
  biome: [{ from: "biome.json", to: "biome.json", isShared: true }],
  eslint: ({ language }) => [
    { from: `eslint.config.${ext(language)}`, to: `eslint.config.${ext(language)}` },
  ],
  oxlint: [{ from: ".oxlintrc.json", to: ".oxlintrc.json", isShared: true }],
};

export function setupTemplateFiles(options: Options, targetDir: string) {
  const { template, language, framework, linter } = options;

  const templateRoot = dist(`templates/${template}`, import.meta.url);
  const fromDir = join(templateRoot, language, framework);

  const resolve = (slice?: FileSlice) =>
    typeof slice === "function" ? slice(options) : (slice ?? []);

  const files: FileMapping[] = [
    ...resolve(COMMON_FILES),
    ...resolve(LANGUAGE_FILES[language]),
    ...resolve(FRAMEWORKS[framework]),
    ...resolve(LINTERS[linter]),
  ];

  for (const file of files) {
    const src = (() => {
      if (file.isGlobal) return join(templateRoot, file.from); // not used but might come in handy
      if (file.isShared) return join(templateRoot, "shared", file.from);
      return join(fromDir, file.from);
    })();
    const dest = join(targetDir, file.to);

    if (!existsSync(src)) {
      log.warn(`[Template] Source missing: ${src}`);
      continue;
    }

    mkdirp(dirname(dest));

    let content = readFileSync(src, "utf8");
    if (file.action?.modify) {
      content = file.action.modify(content, options);
    }

    writeFileSync(dest, content, "utf8");
  }
}
