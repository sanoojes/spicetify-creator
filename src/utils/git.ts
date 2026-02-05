// from https://github.com/vercel/next.js/blob/469e513c5f2179ecd8292be7f0855f28acd6e7d8/packages/create-next-app/helpers/git.ts#L1

import { execSync } from "node:child_process";
import { join } from "node:path";
import { rmSync } from "node:fs";

function isInGitRepository(): boolean {
  try {
    execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
    return true;
  } catch {}
  return false;
}

function isInMercurialRepository(): boolean {
  try {
    execSync("hg --cwd . root", { stdio: "ignore" });
    return true;
  } catch {}
  return false;
}

function isDefaultBranchSet(): boolean {
  try {
    execSync("git config init.defaultBranch", { stdio: "ignore" });
    return true;
  } catch {}
  return false;
}

export function tryGitInit(root: string): boolean {
  let didInit = false;
  try {
    execSync("git --version", { stdio: "ignore" });
    if (isInGitRepository() || isInMercurialRepository()) {
      return false;
    }

    execSync("git init", { stdio: "ignore" });
    didInit = true;

    if (!isDefaultBranchSet()) {
      execSync("git checkout -b main", { stdio: "ignore" });
    }

    execSync("git add -A", { stdio: "ignore" });
    execSync('git commit -m "Initial commit from @spicetify/creator create"', {
      stdio: "ignore",
    });
    return true;
  } catch {
    if (didInit) {
      try {
        rmSync(join(root, ".git"), { recursive: true, force: true });
      } catch {}
    }
    return false;
  }
}
