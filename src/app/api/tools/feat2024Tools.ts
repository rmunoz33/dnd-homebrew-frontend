import { Tool, toolRegistry } from "./registry";
import { createDbLookupTool } from "@/lib/db/toolFactory";
import Feat2024Model from "@/lib/db/models/feat2024";

const getFeat2024Details: Tool = {
  name: "getFeat2024Details",
  description:
    "Get detailed information for 2024 D&D feats including description, type (origin, general, fighting-style, epic-boon), prerequisites, and repeatability. Use when players ask about feats under the 2024 rules.",
  parameters: [
    {
      name: "featName",
      type: "string",
      description:
        "Exact name of the feat (e.g., 'Alert', 'Lucky', 'Magic Initiate')",
      required: true,
    },
  ],
  execute: createDbLookupTool(Feat2024Model, "Feat (2024)", "featName"),
};

toolRegistry.register(getFeat2024Details);

export { getFeat2024Details };
