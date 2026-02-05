import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { log } from "@clack/prompts";
import { pc } from "@/utils/common";

export type PackageManagerType = "npm" | "pnpm" | "yarn" | "bun";
export const packageManagers: PackageManagerType[] = ["npm", "pnpm", "yarn", "bun"];

export function getPackageManager(): PackageManagerType {
  const userAgent = process.env.npm_config_user_agent ?? "";

  if (userAgent.startsWith("yarn")) return "yarn";
  if (userAgent.startsWith("pnpm")) return "pnpm";
  if (userAgent.startsWith("bun")) return "bun";

  return "npm";
}

// taken from https://github.com/vercel/next.js/blob/9d2d2421adfd903de2c487164fdfc71de664d6b0/packages/create-next-app/helpers/install.ts
/**
 * Spawn a package manager installation based on user preference.
 *
 * @returns A Promise that resolves once the installation is finished.
 */
export async function installPackages(
  /** Indicate which package manager to use. */
  packageManager: PackageManagerType,
  /** Indicate whether there is an active Internet connection.*/
  isOnline: boolean,
): Promise<void> {
  const args: string[] = ["install"];
  if (!isOnline) {
    log.warn(pc.yellow("You appear to be offline.\nFalling back to the local cache."));
    args.push("--offline");
  }
  /**
   * Return a Promise that resolves once the installation is finished.
   */
  return new Promise((resolve, reject) => {
    /**
     * Spawn the installation process.
     */
    const child = spawn(packageManager, args, {
      stdio: ["inherit", "pipe", "pipe"],
      env: {
        ...process.env,
        ADBLOCK: "1",
        // we set NODE_ENV to development as pnpm skips dev
        // dependencies when production
        NODE_ENV: "development",
        DISABLE_OPENCOLLECTIVE: "1",
      },
    });

    createInterface({ input: child.stdout }).on("line", (line) => {
      log.message(line);
    });

    createInterface({ input: child.stderr }).on("line", (line) => {
      log.error(line);
    });

    child.on("close", (code) => {
      log.message();
      if (code !== 0) {
        reject({ command: `${packageManager} ${args.join(" ")}` });
        return;
      }
      resolve();
    });
  });
}
