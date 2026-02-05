import "dotenv/config";

const isInternal = process.env.SPICE_INTERNAL === "true";
const isDev = process.env.IS_DEV === "true";
const spicetifyBin = process.env.SPICETIFY_BIN || process.env.SPICE_BIN || "spicetify";
export const env = { isInternal, isDev, spicetifyBin };
