#!/usr/bin/env node
import { Command } from "commander";
import { build } from "@/commands/build";
import { create } from "@/commands/create";
import { dev } from "@/commands/dev";
import { update_types } from "@/commands/update-types";
import { env } from "@/env";
import { logger } from "@/utils/logger";
import { version } from "@package.json" with { type: "json" };

logger.debug(`Env: ${JSON.stringify(env, null, 2)}\n`);

const command = new Command();
command
  .version(version)
  .addCommand(create.alias("init"))
  .addCommand(build)
  .addCommand(dev)
  .addCommand(update_types);
command.parse();
