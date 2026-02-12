import { Tool, toolRegistry } from "./registry";
import { createDbLookupTool } from "@/lib/db/toolFactory";
import EquipmentModel from "@/lib/db/models/equipment";

const getEquipmentDetails: Tool = {
  name: "getEquipmentDetails",
  description:
    "Get detailed information for D&D equipment including weapons, armor, magic items, and gear. Use when players ask about items, want to buy equipment, or need item stats.",
  parameters: [
    {
      name: "itemName",
      type: "string",
      description:
        "Exact name of the equipment item (e.g., 'Longsword', 'Plate Armor', 'Potion of Healing')",
      required: true,
    },
  ],
  execute: createDbLookupTool(EquipmentModel, "Equipment", "itemName", {
    lookupByIndex: true,
  }),
};

toolRegistry.register(getEquipmentDetails);

export { getEquipmentDetails };
