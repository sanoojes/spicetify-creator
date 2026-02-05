import "dotenv/config";

const isInternal = process.env.SPICE_INTERNAL === "true";
const isDev = process.env.IS_DEV === "true";
export const env = { isInternal, isDev };
