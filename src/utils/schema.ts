import * as v from "valibot";
import { pc } from "@/utils/common";
import { logger } from "@/utils/logger";

export function safeParse<TSchema extends v.GenericSchema>(
  schema: TSchema,
  data: unknown,
  type: string = "CLI",
): v.InferOutput<TSchema> {
  const result = v.safeParse(schema, data);
  if (result.success) return result.output;

  logger.error(`\n${pc.bgRed(pc.black(" ERROR "))} ${pc.red(`Invalid ${type} options:`)}`);

  result.issues.forEach((issue) => {
    const path = issue.path?.map((p) => p.key).join(".") || "input";

    logger.error(`${pc.dim(" └─")} ${pc.yellow(path)}: ${pc.white(issue.message)}`);
  });

  logger.error(`\n${pc.dim("Check your command flags and try again.")}\n`);
  process.exit(1);
}
