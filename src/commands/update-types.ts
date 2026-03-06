import { Command } from "commander";
import { updateTypes } from "@/utils/update-types";

export const update_types = new Command("update-types")
  .description("Update Spicetify Types")
  .action(async () => {
    await updateTypes();
  });
