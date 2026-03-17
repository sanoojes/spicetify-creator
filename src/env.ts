import "dotenv/config";

const isDev = process.env.IS_DEV === "true";
const spicetifyBin = process.env.SPICETIFY_BIN || process.env.SPICE_BIN || "spicetify";
const skipSpicetify = process.env.SPICETIFY_SKIP === "true" || !!process.env.CI;

export const env = { isDev, spicetifyBin, skipSpicetify };
