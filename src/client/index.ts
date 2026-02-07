import type { FileConfig as Config } from "@/config/schema";

export type * from "@/client/types/spicetify.ts";

export function defineConfig(config: Config): Config {
  return config;
}
