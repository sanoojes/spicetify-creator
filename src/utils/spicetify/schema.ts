import * as v from "valibot";

export const SpicetifyConfigSchema = v.object({
  Setting: v.object({
    spotify_path: v.string(),
    prefs_path: v.string(),
    inject_theme_js: v.string(),
    inject_css: v.string(),
    current_theme: v.string(),
    color_scheme: v.string(),
    always_enable_devtools: v.string(),
  }),
  AdditionalOptions: v.object({
    experimental_features: v.string(),
    extensions: v.pipe(
      v.string(),
      v.transform((input) => input.split("|").filter(Boolean)),
    ),
    custom_apps: v.string(),
  }),
  Backup: v.object({
    version: v.string(),
    with: v.string(),
  }),
});
export type SpicetifyConfig = v.InferOutput<typeof SpicetifyConfigSchema>;
