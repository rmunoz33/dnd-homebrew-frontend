import { Tool, toolRegistry } from "./registry";
import { createDbLookupTool } from "@/lib/db/toolFactory";
import MagicItemModel from "@/lib/db/models/magicItem";

const getMagicItemDetails: Tool = {
  name: "getMagicItemDetails",
  description:
    "Get detailed information for D&D magic items including rarity, attunement, properties, and special abilities. Use when players ask about magic items, find treasure, or need magic item mechanics.",
  parameters: [
    {
      name: "itemName",
      type: "string",
      description:
        "Exact name of the magic item (e.g., 'Sword of Sharpness', 'Ring of Protection', 'Potion of Healing', 'Staff of Power')",
      required: true,
    },
  ],
  execute: createDbLookupTool(MagicItemModel, "Magic item", "itemName"),
};

toolRegistry.register(getMagicItemDetails);

export { getMagicItemDetails };
