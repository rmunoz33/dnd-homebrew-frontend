import { Tool, toolRegistry } from "./registry";
import { createDbLookupTool } from "@/lib/db/toolFactory";
import RuleModel from "@/lib/db/models/rule";

const getRuleDetails: Tool = {
  name: "getRuleDetails",
  description:
    "Get detailed information for D&D rules including game mechanics, combat rules, and system explanations. Use when players ask about game rules, mechanics, or need clarification on how something works.",
  parameters: [
    {
      name: "ruleName",
      type: "string",
      description:
        "Exact name of the rule or mechanic (e.g., 'Combat', 'Ability Scores', 'Saving Throws', 'Proficiency Bonus')",
      required: true,
    },
  ],
  execute: createDbLookupTool(RuleModel, "Rule", "ruleName"),
};

toolRegistry.register(getRuleDetails);

export { getRuleDetails };
