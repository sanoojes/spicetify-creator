import { Command, Option } from "commander";
import * as v from "valibot";
import { createProject } from "@/create";
import { frameworkTypes, languageTypes, linterTypes, templateTypes } from "@/metadata";
import { pc, runCommand } from "@/utils/common";
import { packageManagers } from "@/utils/package-manager";
import { safeParse } from "@/utils/schema";
import { logger } from "@/utils/logger";

export const PathSchema = v.optional(v.string());
export const OptionsSchema = v.strictObject({
  install: v.boolean(),
  dirCheck: v.boolean(),
  language: v.optional(v.picklist(languageTypes)),
  template: v.optional(v.picklist(templateTypes)),
  framework: v.optional(v.picklist(frameworkTypes)),
  linter: v.optional(v.picklist(linterTypes)),
  packageManager: v.optional(v.picklist(packageManagers)),
});
export type Path = v.InferOutput<typeof PathSchema>;
export type CreateOptions = v.InferOutput<typeof OptionsSchema>;

const templateOption = new Option("-t, --template <name>", "Template to use").choices(
  templateTypes,
);

const linterOption = new Option("--linter <name>", "Linter to use").choices(linterTypes);

const langOption = new Option("--language <lang>", "Language to use").choices(languageTypes);

const frameworkOption = new Option("--framework <name>", "Framework to use").choices(
  frameworkTypes,
);

const packageManagerOption = new Option(
  "--pm, --package-manager <name>",
  "Package manager to use",
).choices(packageManagers);

export const create = new Command("create")
  .description("Scaffolds a new spicetify project")
  .argument("[path]", "Where the project will be created")
  .addOption(templateOption)
  .addOption(langOption)
  .addOption(frameworkOption)
  .addOption(linterOption)
  .addOption(packageManagerOption)
  .option("--no-install", "Skip installing packages")
  .option("--no-dir-check", "Even if the folder is not empty, no prompt will be shown")
  .action((path, opts) => {
    try {
      const cwd = safeParse(PathSchema, path);
      const options = safeParse(OptionsSchema, opts);

      runCommand(
        async () => {
          await createProject(cwd, options);
        },
        {
          outro: true,
          message: (opts) => `Welcome to ${opts.name} CLI ${pc.gray(`(v${opts.version})`)}`,
        },
      );
    } catch (error) {
      if (v.isValiError(error)) {
        logger.error("\nInvalid configuration:");

        error.issues.forEach((issue) => {
          const path = issue.path?.map((p) => p.key).join(".") || "input";
          logger.error(`${pc.yellow(`  - ${path}:`)} ${issue.message}`);
        });
      } else {
        logger.error(
          `\nAn unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      process.exit(1);
    }
  });
