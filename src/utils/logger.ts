import readline from "node:readline";
import { name, version } from "@package.json" with { type: "json" };
import { pc } from "@/utils/common";
import { env } from "@/env";
import { CHECK, WARN } from "@/constants";

export type LogMode = "dev" | "prod";

export class Logger {
  constructor(
    private prefix: string = "",
    private mode: LogMode = env.isDev ? "dev" : "prod",
  ) {}

  private get isDev() {
    return this.mode === "dev";
  }

  private getPrefix(): string | null {
    if (!this.prefix || !env.isDev) return null;
    return pc.dim(`[${this.prefix.toLowerCase()}]`);
  }
  private add(fn: (...args: unknown[]) => void, args: unknown[]) {
    const p = this.getPrefix();
    if (p) {
      fn(p, ...args);
    } else {
      fn(...args);
    }
  }

  greeting(msg: string = "") {
    const label = pc.bgBlue(pc.black(` ${name.toUpperCase()} `));
    console.log(`${label} ${pc.dim(`v${version}`)} ${msg}`);
  }

  info(...args: unknown[]) {
    this.add(console.info, args);
  }

  success(m: string) {
    console.log(`${CHECK} ${pc.green(m)}`);
  }

  warn(m: string) {
    console.log(`${WARN} ${pc.yellow(m)}`);
  }

  cwarn(...args: unknown[]) {
    this.add(console.warn, args);
  }

  error(...errors: unknown[]) {
    const formatted: unknown[] = [];

    for (const err of errors) {
      if (err instanceof Error) {
        formatted.push(pc.red(err.message));

        if (this.isDev && err.stack) {
          const stack = err.stack.split("\n").slice(1).join("\n");
          formatted.push(pc.dim(stack));
        }
      } else {
        formatted.push(err);
      }
    }

    this.add(console.error, formatted);
  }

  log(...args: unknown[]) {
    if (!this.isDev) return;
    this.add(console.log, args);
  }

  debug(...args: unknown[]) {
    if (!this.isDev) return;
    this.add((...a) => console.log(pc.magenta("[debug]"), ...a), args);
  }

  clear() {
    if (!process.stdout.isTTY || process.env.CI) return;
    if (this.isDev) {
      this.log("clear skipped");
      return;
    }
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
  }
}

export const createLogger = (prefix = "", mode?: LogMode) => new Logger(prefix, mode);

export const logger = createLogger("common");
