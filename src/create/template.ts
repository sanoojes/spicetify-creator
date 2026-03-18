import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { log } from "@clack/prompts";
import { CONFIG_REF_LINK, DOCS_LINK, GITHUB_LINK, DISCORD_LINK, SPICETIFY_LINK } from "@/constants";
import type { Options } from "@/create";
import type { FileAction, FileMapping, FileRegistry, FileSlice } from "@/create/types/file";
import { dist, mkdirp, replace } from "@/utils/fs";
import { urlSlugify } from "@/utils/common";

const ext = (lang: Options["language"], jsx: boolean = false) =>
  lang === "ts" ? `ts${jsx ? "x" : ""}` : `js${jsx ? "x" : ""}`;

const kv = ({ name, language, framework, linter, packageManager, template }: Options) => ({
  "{{project-name}}": name,
  "{{project-url}}": `/${urlSlugify(name)}`,
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

export const SHARED_FILES: FileSlice = (opts) => {
  const isShared = true;
  const files = [
    {
      from: "README.template.md",
      to: "README.md",
      action,
      isShared,
    },
    { from: "DOT-gitignore", to: ".gitignore", isShared },
    {
      from: `spice.config.${ext(opts.language)}`,
      to: `spice.config.${ext(opts.language)}`,
      action,
      isShared,
    },
  ];

  if (opts.template === "custom-app") {
    files.push({
      from: `css/app.module.scss`,
      to: `src/css/app.module.scss`,
      action,
      isShared,
    });
    files.push({
      from: `icon.svg`,
      to: `src/icon.svg`,
      action,
      isShared,
    });
    files.push({
      from: `icon-active.svg`,
      to: `src/icon-active.svg`,
      action,
      isShared,
    });
    files.push({
      from: "app.css",
      to: "src/extension/app.css",
      action,
      isShared,
    });
  } else {
    files.push({
      from: "app.css",
      to: "src/app.css",
      action,
      isShared,
    });
  }

  return files;
};
export const LANGUAGE_FILES: FileRegistry<Options["language"]> = {
  js: [{ from: "jsconfig.json", to: "jsconfig.json", isShared: true }],
  ts: [
    { from: "tsconfig.json", to: "tsconfig.json", isShared: true },
    { from: "tsconfig.app.json", to: "tsconfig.app.json", isShared: true },
    { from: "tsconfig.node.json", to: "tsconfig.node.json", isShared: true },
  ],
};

export const FRAMEWORKS: FileRegistry<Options["framework"]> = {
  react: ({ language, template }) => {
    const react: FileSlice = [
      {
        from: `src/app.${ext(language, true)}`,
        to: `src/app.${ext(language, true)}`,
        action,
      },
      {
        from: `src/components/Onboarding.${ext(language, true)}`,
        to: `src/components/Onboarding.${ext(language, true)}`,
        action,
      },
    ];

    if (template === "custom-app") {
      react.push({
        from: `src/extension/index.${ext(language, true)}`,
        to: `src/extension/index.${ext(language, true)}`,
        action,
      });
    }

    return react;
  },
  vanilla: ({ language, template }) => {
    const vanilla: FileSlice = [
      { from: `src/app.${ext(language)}`, to: `src/app.${ext(language)}`, action },
      {
        from: `src/components/Onboarding.${ext(language)}`,
        to: `src/components/Onboarding.${ext(language)}`,
        action,
      },
    ];

    if (template === "custom-app") {
      throw new Error("vanilla doesn't exist for custom-app");
    }

    return vanilla;
  },
};

export const LINTERS: FileRegistry<Options["linter"]> = {
  biome: [{ from: "biome.json", to: "biome.json", isShared: true }],
  eslint: ({ language }) => [
    { from: `eslint.config.${ext(language)}`, to: `eslint.config.${ext(language)}` },
  ],
  oxlint: [{ from: "DOT-oxlintrc.json", to: ".oxlintrc.json", isShared: true }],
};

const getFiles = (options: Options) => {
  const resolve = (slice?: FileSlice) =>
    typeof slice === "function" ? slice(options) : (slice ?? []);

  const files: FileMapping[] = [
    ...resolve(SHARED_FILES),
    ...resolve(LANGUAGE_FILES[options.language]),
    ...resolve(FRAMEWORKS[options.framework]),
    ...resolve(LINTERS[options.linter]),
  ];

  return files;
};

export function setupTemplateFiles(options: Options, targetDir: string) {
  const { template, language, framework } = options;

  const templateRoot = dist(`templates/${template}`, import.meta.url);
  const fromDir = join(templateRoot, language, framework);

  for (const file of getFiles(options)) {
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
