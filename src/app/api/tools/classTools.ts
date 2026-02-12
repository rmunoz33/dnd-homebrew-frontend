import { Tool, toolRegistry } from "./registry";
import { createDbLookupTool } from "@/lib/db/toolFactory";
import ClassModel from "@/lib/db/models/class";

const getClassDetails: Tool = {
  name: "getClassDetails",
  description:
    "Get detailed information for D&D classes including features, spellcasting, hit dice, and proficiencies. Use when players ask about class abilities, features, or want to understand a class.",
  parameters: [
    {
      name: "className",
      type: "string",
      description:
        "Exact name of the class (e.g., 'Fighter', 'Wizard', 'Cleric', 'Rogue')",
      required: true,
    },
  ],
  execute: createDbLookupTool(ClassModel, "Class", "className"),
};

toolRegistry.register(getClassDetails);

export { getClassDetails };
