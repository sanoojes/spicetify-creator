import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { log } from "@clack/prompts";
import { CONFIG_REF_LINK, DOCS_LINK, GITHUB_LINK, SPICETIFY_LINK } from "@/constants";
import type { Options } from "@/create";
import type { FileMapping, FileRegistry, FileSlice } from "@/create/types/file";
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
  "{{github-link}}": GITHUB_LINK,
  "{{spicetify-link}}": SPICETIFY_LINK,
  "{{config-reference-link}}": CONFIG_REF_LINK,
});

export const COMMON_FILES: FileSlice = (opts) => [
  {
    from: "shared/README.template.md",
    to: "README.md",
    action: {
      modify(c, opts) {
        return replace(c, kv(opts));
      },
    },
    isGlobal: true,
  },
  { from: "shared/.gitignore", to: ".gitignore", isGlobal: true },
  {
    from: `shared/spice.config.${ext(opts.language)}`,
    to: `spice.config.${ext(opts.language)}`,
    action: {
      modify(c, opts) {
        return replace(c, kv(opts));
      },
    },
    isGlobal: true,
  },
  {
    from: "shared/app.css",
    to: "src/app.css",
    action: {
      modify(c, opts) {
        return replace(c, kv(opts));
      },
    },
    isGlobal: true,
  },
];

export const LANGUAGE_FILES: FileRegistry<Options["language"]> = {
  js: [
    {
      from: "shared/jsconfig.json",
      to: "jsconfig.json",
      isGlobal: true,
    },
  ],
  ts: [
    {
      from: "shared/tsconfig.json",
      to: "tsconfig.json",
      isGlobal: true,
    },
  ],
};

export const FRAMEWORKS: FileRegistry<Options["framework"]> = {
  react: ({ language }) => [
    {
      from: `src/app.${ext(language)}x`,
      to: `src/app.${ext(language)}x`,
    },
  ],
  vanilla: ({ language }) => [
    {
      from: `src/app.${ext(language)}`,
      to: `src/app.${ext(language)}`,
    },
  ],
};

export const LINTERS: FileRegistry<Options["linter"]> = {
  biome: [{ from: "shared/biome.json", to: "biome.json", isGlobal: true }],
  eslint: ({ language }) => [
    { from: `eslint.config.${ext(language)}`, to: `eslint.config.${ext(language)}` },
  ],
  oxlint: [{ from: "shared/.oxlintrc.json", to: ".oxlintrc.json", isGlobal: true }],
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
    const src = file.isGlobal ? join(templateRoot, file.from) : join(fromDir, file.from);
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
