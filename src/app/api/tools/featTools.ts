import { Tool, toolRegistry } from "./registry";
import { createDbLookupTool } from "@/lib/db/toolFactory";
import FeatModel from "@/lib/db/models/feat";

const getFeatDetails: Tool = {
  name: "getFeatDetails",
  description:
    "Get detailed information for D&D feats including prerequisites, benefits, and special abilities. Use when players ask about character feats, want to choose feats, or need to understand feat mechanics.",
  parameters: [
    {
      name: "featName",
      type: "string",
      description:
        "Exact name of the feat (e.g., 'Alert', 'Lucky', 'Sharpshooter', 'War Caster')",
      required: true,
    },
  ],
  execute: createDbLookupTool(FeatModel, "Feat", "featName"),
};

toolRegistry.register(getFeatDetails);

export { getFeatDetails };
