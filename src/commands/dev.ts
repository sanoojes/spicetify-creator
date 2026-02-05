import { Command } from "commander";
import * as v from "valibot";
import { dev as runDev } from "@/dev";
import { safeParse } from "@/utils/schema";

const CLIOptionsSchema = v.strictObject({
  port: v.optional(
    v.pipe(
      v.union([v.string(), v.number()]),
      v.transform((val) => Number(val)),
      v.number("Port must be a valid number"),
      v.minValue(1, "Port must be greater than 0"),
      v.maxValue(65535, "Port must be less than 65536"),
    ),
  ),
});

export type DevCLIOptions = v.InferOutput<typeof CLIOptionsSchema>;

export const dev = new Command("dev")
  .description("Develop your spicetify project")
  .option("-p, --port <number>", "Port for the development server")
  .action(async (opts) => {
    const options = safeParse(CLIOptionsSchema, opts);
    await runDev(options);
  });
