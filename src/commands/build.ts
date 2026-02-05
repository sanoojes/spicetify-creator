import { Command } from "commander";
import * as v from "valibot";
import { build as buildProject } from "@/build";
import { safeParse } from "@/utils/schema";

const CLIOptionsSchema = v.strictObject({
  watch: v.boolean(),
  minify: v.boolean(),
  apply: v.boolean(),
  copy: v.boolean(),
});

export type BuildCLIOptions = v.InferOutput<typeof CLIOptionsSchema>;

export const build = new Command("build")
  .description("Build your spicetify project")
  .option("-a, --apply", "Apply to spicetify", false)
  .option("-w, --watch", "Watch mode", false)
  .option("--no-copy", "Do not copy files to spicetify")
  .option("--no-minify", "Disable code minification")
  .action(async (opts) => {
    const options = safeParse(CLIOptionsSchema, opts);

    await buildProject(options);
  });
