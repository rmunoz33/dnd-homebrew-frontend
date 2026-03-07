import { Tool, toolRegistry } from "./registry";
import { createDbLookupTool } from "@/lib/db/toolFactory";
import Proficiency2024Model from "@/lib/db/models/proficiency2024";

const getProficiency2024Details: Tool = {
  name: "getProficiency2024Details",
  description:
    "Get detailed information for 2024 D&D proficiencies including type, associated backgrounds, and classes. Use when players ask about proficiencies under the 2024 rules.",
  parameters: [
    {
      name: "proficiencyName",
      type: "string",
      description:
        "Exact name of the proficiency (e.g., 'Acrobatics', 'Alchemist\\'s Supplies')",
      required: true,
    },
  ],
  execute: createDbLookupTool(Proficiency2024Model, "Proficiency (2024)", "proficiencyName"),
};

toolRegistry.register(getProficiency2024Details);

export { getProficiency2024Details };
