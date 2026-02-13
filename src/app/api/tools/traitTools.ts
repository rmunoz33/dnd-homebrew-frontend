import { Tool, toolRegistry } from "./registry";
import { createDbLookupTool } from "@/lib/db/toolFactory";
import TraitModel from "@/lib/db/models/trait";

const getTraitDetails: Tool = {
  name: "getTraitDetails",
  description:
    "Get detailed information for D&D traits including racial traits, class features, and special abilities. Use when players ask about specific traits, abilities, or need to understand trait mechanics.",
  parameters: [
    {
      name: "traitName",
      type: "string",
      description:
        "Exact name of the trait (e.g., 'Darkvision', 'Fey Ancestry', 'Second Wind', 'Sneak Attack')",
      required: true,
    },
  ],
  execute: createDbLookupTool(TraitModel, "Trait", "traitName"),
};

toolRegistry.register(getTraitDetails);

export { getTraitDetails };
