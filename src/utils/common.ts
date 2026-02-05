import path from "node:path";
import * as p from "@clack/prompts";
import { name, version } from "@package.json" with { type: "json" };
import pc from "picocolors";
export { pc };

type MaybePromise = () => Promise<void> | void;
type Options = {
  outro: boolean;
  message?: (opts: { name: string; version: string }) => string;
};
export const runCommand = async (
  action: MaybePromise,
  options: Options = {
    outro: false,
    message: undefined,
  },
) => {
  try {
    p.intro(
      options.message === undefined || typeof options.message !== "function"
        ? `${name} ${pc.gray(`(v${version})`)}`
        : options.message({ name, version }),
    );

    await action();

    if (options.outro) p.outro("You're all set!");
  } catch (e) {
    if (e instanceof Error) {
      p.log.error(e.stack ?? String(e));
      p.log.message();
    }
    p.cancel("Operation failed.");
  }
};

export const normalizePosix = (dir: string) => path.posix.normalize(dir.replace(/\\/g, "/"));

export function urlSlugify(text: string) {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
}

export function varSlugify(text: string) {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w]/g, "")
    .replace(/__+/g, "_")
    .replace(/^[0-9]/, (val) => `_${val}`);
}
