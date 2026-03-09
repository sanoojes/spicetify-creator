import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { replace } from "@/utils/replace";

export { replace };

export function mkdirp(dir: string): void {
  try {
    mkdirSync(dir, { recursive: true });
  } catch (e) {
    if ((e as NodeJS.ErrnoException)?.code === "EEXIST") return;
    throw e;
  }
}

function identity<T>(x: T): T {
  return x;
}

type RenameFn = (basename: string) => string;
type CopyEntry = { from: string; to: string };
type CopyFn = {
  kv: Record<string, string>;
  rename?: RenameFn;
} & CopyEntry;

export function copy({ to, from, rename = identity, kv }: CopyFn): void {
  if (!existsSync(from)) return;
  const stats = statSync(from);

  if (stats.isDirectory()) {
    readdirSync(from).forEach((file) => {
      copy({ from: join(from, file), to: join(to, rename(file)), rename, kv });
    });
  } else {
    mkdirp(dirname(to));
    writeFileSync(to, replace(readFileSync(from, "utf-8"), kv));
  }
}

export function dist(path: string, url = import.meta.url): string {
  // we need to make this check, because vitest is making the package root the cwd,
  // but executing the cli from the command line already makes the dist folder the cwd.
  const insideDistFolder = url.includes("dist");

  return fileURLToPath(new URL(`./${!insideDistFolder ? "dist/" : ""}${path}`, url).href);
}
