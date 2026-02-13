import { Tool, toolRegistry } from "./registry";
import { createDbLookupTool } from "@/lib/db/toolFactory";
import ConditionModel from "@/lib/db/models/condition";

const getConditionDetails: Tool = {
  name: "getConditionDetails",
  description:
    "Get detailed information for D&D conditions including effects, immunities, and how to remove them. Use when players ask about status effects, conditions, or need to understand what a condition does.",
  parameters: [
    {
      name: "conditionName",
      type: "string",
      description:
        "Exact name of the condition (e.g., 'Poisoned', 'Paralyzed', 'Invisible', 'Blinded')",
      required: true,
    },
  ],
  execute: createDbLookupTool(ConditionModel, "Condition", "conditionName"),
};

toolRegistry.register(getConditionDetails);

export { getConditionDetails };
