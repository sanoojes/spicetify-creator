import { resolve } from "path";
import { defineConfig } from "@spicetify/creator";

// Learn more: {{config-reference-link}}
export default defineConfig({
  name: "{{project-name}}",
  framework: "{{framework}}",
  linter: "{{linter}}",
  template: "{{template}}",
  packageManager: "{{package-manager}}",
  esbuildOptions: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
