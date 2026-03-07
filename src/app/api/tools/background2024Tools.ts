import { Tool, toolRegistry } from "./registry";
import { createDbLookupTool } from "@/lib/db/toolFactory";
import Background2024Model from "@/lib/db/models/background2024";

const getBackground2024Details: Tool = {
  name: "getBackground2024Details",
  description:
    "Get detailed information for 2024 D&D backgrounds including ability scores, feat, proficiencies, and equipment options. Use when players ask about backgrounds under the 2024 rules.",
  parameters: [
    {
      name: "backgroundName",
      type: "string",
      description:
        "Exact name of the background (e.g., 'Acolyte', 'Criminal', 'Sage', 'Soldier')",
      required: true,
    },
  ],
  execute: createDbLookupTool(Background2024Model, "Background (2024)", "backgroundName"),
};

toolRegistry.register(getBackground2024Details);

export { getBackground2024Details };
