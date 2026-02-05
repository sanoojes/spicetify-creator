import { cp } from "node:fs/promises";
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/bin.ts", "src/client/index.ts"],
  dts: true,
  exports: true,
  inputOptions: {
    experimental: {
      resolveNewUrlToAsset: false,
    },
  },
  hooks: {
    async "build:before"() {
      await copyTemplates();
    },
  },
});

export async function copyTemplates() {
  const start = performance.now();

  await cp("templates", "dist/templates", { recursive: true });
  await cp("templates", "src/create/dist/templates", { recursive: true });

  const green = "\x1b[32m";
  const reset = "\x1b[0m";
  console.log(`${green}✔${reset} Templates copied in ${Math.round(performance.now() - start)}ms`);
}
