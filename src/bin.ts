#!/usr/bin/env node
import { Command } from "commander";
import { build } from "@/commands/build";
import { create } from "@/commands/create";
import { dev } from "@/commands/dev";
import { env } from "@/env";
import { logger } from "@/utils/logger";

logger.debug(`Env: ${JSON.stringify(env, null, 2)}\n`);

const command = new Command();
create.alias("init");
command.addCommand(create).addCommand(build).addCommand(dev);
command.parse();
