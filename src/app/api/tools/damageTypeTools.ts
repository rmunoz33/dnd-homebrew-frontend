import { Tool, toolRegistry } from "./registry";
import { createDbLookupTool } from "@/lib/db/toolFactory";
import DamageTypeModel from "@/lib/db/models/damageType";

const getDamageTypeDetails: Tool = {
  name: "getDamageTypeDetails",
  description:
    "Get detailed information for D&D damage types including descriptions, typical sources, and effects. Use when players ask about damage types, resistances, vulnerabilities, or need to understand damage mechanics.",
  parameters: [
    {
      name: "damageTypeName",
      type: "string",
      description:
        "Exact name of the damage type (e.g., 'Slashing', 'Fire', 'Cold', 'Lightning', 'Necrotic', 'Radiant')",
      required: true,
    },
  ],
  execute: createDbLookupTool(DamageTypeModel, "Damage type", "damageTypeName"),
};

toolRegistry.register(getDamageTypeDetails);

export { getDamageTypeDetails };
