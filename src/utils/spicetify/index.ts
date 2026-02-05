import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "ini";
import * as v from "valibot";
import { type SpicetifyConfig, SpicetifyConfigSchema } from "@/utils/spicetify/schema";

export function runSpice(args: string[]) {
  return spawnSync("spicetify", args, { encoding: "utf-8" });
}

export const getExtensionDir = () => join(getSpiceDataPath(), "Extensions");
export const getThemesDir = () => join(getSpiceDataPath(), "Themes");

type SpotifyDIRs = {
  xpui: string;
  backup: string;
  backupXpui: string;
  extensions: string;
};
export const getSpotifyDirs = async (path?: string): Promise<SpotifyDIRs> => {
  if (!path) path = (await getSpicetifyConfig()).Setting.spotify_path;
  const xpui = join(path, "Apps/xpui/");
  const backup = join(path, "backup/");

  return {
    xpui,
    backup,
    backupXpui: join(backup, "Apps/xpui/"),
    extensions: join(xpui, "extensions/"),
  };
};

export async function getSpicetifyConfig(): Promise<SpicetifyConfig> {
  const { stdout, stderr, error } = runSpice(["path", "-c"]);
  if (error || stderr) {
    throw new Error(`Failed to locate Spicetify config: ${stderr || error?.message}`);
  }

  const text = await readFile(stdout.trim(), "utf-8");
  const rawConfig = parse(text);
  const result = v.safeParse(SpicetifyConfigSchema, rawConfig);
  if (result.success) {
    return result.output;
  } else {
    throw new Error("Spicetify Config Validation Failed:", v.flatten(result.issues).nested);
  }
}

export function getSpiceDataPath(): string {
  const { stdout, stderr, error } = runSpice(["path", "userdata"]);
  if (error || stderr) {
    throw new Error(`Failed to locate Spicetify config: ${stderr || error?.message}`);
  }
  return stdout.trim();
}
