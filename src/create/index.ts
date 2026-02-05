import * as p from "@clack/prompts";
import { existsSync, lstatSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { chdir } from "node:process";
import type { CreateOptions, Path } from "@/commands/create";
import { createPackageJSON, validateProjectName, writePackageJSON } from "@/create/package";
import { setupTemplateFiles } from "@/create/template";
import type { PackageJSON } from "@/create/types/package";
import {
  type FrameworkType,
  frameworkOptions,
  type LanguageType,
  type LinterType,
  languageOptions,
  linterOptions,
  type TemplateType,
  templateOptions,
} from "@/metadata";
import { normalizePosix, pc } from "@/utils/common";
import { mkdirp } from "@/utils/fs";
import { getOnline } from "@/utils/is-online";
import {
  getPackageManager,
  installPackages,
  type PackageManagerType,
  packageManagers,
} from "@/utils/package-manager";
import { tryGitInit } from "@/utils/git";
import { VALID_PROJECT_FILES } from "@/constants";

const isOnline = await getOnline();

export type Options = {
  name: string;
  install: boolean;
  disableGit: boolean;
  template: TemplateType;
  language: LanguageType;
  linter: LinterType;
  framework: FrameworkType;
  packageManager: PackageManagerType;
};

export async function createProject(cwd: Path, options: CreateOptions) {
  const { directory, template, language, linter, framework, packageManager, disableGit } =
    await p.group(
      {
        directory: async () => {
          if (cwd) return normalizePosix(cwd);

          const defaultPath = "./";
          return await p.text({
            message: "Where would you like your project to be created?",
            placeholder: `  (hit Enter to use '${defaultPath}')`,
            defaultValue: defaultPath,
          });
        },

        force: async ({ results: { directory } }) => {
          if (!options.dirCheck || !directory) return;

          if (!existsSync(directory)) return;

          const root = resolve(directory);
          const name = basename(root);

          const conflicts = readdirSync(root).filter(
            (file) => !VALID_PROJECT_FILES.has(file) && !file.endsWith(".iml"),
          );

          if (conflicts.length === 0) return;

          p.log.warn(`The directory ${pc.green(name)} contains files that could conflict:`);

          const conflictList = conflicts
            .map((file) => {
              try {
                const stats = lstatSync(join(root, file));
                return stats.isDirectory() ? ` ${pc.blue(file)}/` : ` ${file}`;
              } catch {
                return `${file}`;
              }
            })
            .join("\n");

          p.note(conflictList, "Potential Conflicts");

          const force = await p.confirm({
            message: `Directory is not empty. ${pc.yellow("Overwrite and continue?")}`,
            initialValue: false,
          });

          if (p.isCancel(force) || !force) {
            p.cancel("Operation cancelled.");
            process.exit(0);
          }
        },

        template: async () => {
          if (options.template) return options.template;

          return await p.select({
            message: "Select which template you want to chose",
            options: templateOptions,
          });
        },

        framework: async () => {
          if (options.framework) return options.framework;

          return await p.select({
            message: "Select which framework you want to chose",
            options: frameworkOptions,
          });
        },

        language: async () => {
          // TODO: test 'js'
          if (options.language) return options.language;
          return await p.select<LanguageType>({
            message: "Select which language you want to chose",
            initialValue: "ts",
            options: languageOptions,
          });
        },

        linter: async () => {
          if (options.linter) return options.linter;
          return await p.select({
            message: "Select which linter you want to chose",
            options: linterOptions,
          });
        },

        packageManager: async () => {
          if (options.packageManager) return options.packageManager;

          return await p.select({
            message: "Select which package manager you want to choose to install packages",
            options: packageManagers.map((value) => ({
              value,
              title: value,
            })),
            initialValue: getPackageManager(),
          });
        },

        disableGit: async () => {
          if (!options.git) return options.git;

          return !(await p.confirm({
            message: "Initialize a Git repository?",
            initialValue: true,
          }));
        },
      },
      {
        onCancel: () => {
          p.cancel("Operation cancelled.");
          process.exit(0);
        },
      },
    );

  const projectPath = resolve(directory);
  const projectName = await p.text({
    message: "Confirm or enter the package name:",
    initialValue: basename(projectPath),
    validate: validateProjectName,
  });

  if (p.isCancel(projectName)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  const opts: Options = {
    name: projectName,
    template,
    language,
    linter,
    framework,
    packageManager,
    disableGit,
    install: options.install,
  };

  await create(projectPath, opts);

  p.log.success("Project created");
}

export async function create(cwd: string, options: Options) {
  try {
    mkdirp(cwd);
    setupTemplateFiles(options, cwd);

    const pkgJSON = createPackageJSON(options);
    writePackageJSON(pkgJSON, cwd);

    chdir(cwd);
    await promptPackageInstallation(options, pkgJSON);

    if (!options.disableGit) {
      const res = tryGitInit(cwd);
      if (res) {
        p.log.success("Initialized a git repository");
      } else {
        p.log.error("Failed to initialize git repository");
      }
    } else {
      p.log.info("Skipping git initialization");
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected Error";
    p.log.error(`Failed to scaffold ${options.template}: ${message}\n`);
    p.cancel("Exiting...");
    process.exit(1);
  }
}

async function promptPackageInstallation(options: Options, pkg: PackageJSON) {
  if (!options.install) return; // --no-install

  const shouldInstall = await p.confirm({
    message: `Install dependencies using ${options.packageManager}?`,
    initialValue: true,
  });

  if (p.isCancel(shouldInstall)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  try {
    if (shouldInstall) {
      p.log.info(`Installing dependencies with ${options.packageManager}...`);

      await installPackages(options.packageManager, isOnline);

      const formatDeps = (deps: Record<string, string>) => {
        return Object.entries(deps)
          .map(([name, version]) => `${pc.bold(name)}@${pc.blue(version)}`)
          .join("\n");
      };

      if (pkg.dependencies) p.note(formatDeps(pkg.dependencies), "Dependencies");
      if (pkg.devDependencies) p.note(formatDeps(pkg.devDependencies), "Dev Dependencies");

      p.log.info("Dependencies installed successfully.");
    } else {
      p.log.info(`Skipping install. You can run '${options.packageManager} install' later.`);
    }
  } catch {
    p.log.info(`Failed to install dependencies, check the errors above.`);
  }
}
