import { Tool, toolRegistry } from "./registry";
import { createDbLookupTool } from "@/lib/db/toolFactory";
import SkillModel from "@/lib/db/models/skill";

const getSkillDetails: Tool = {
  name: "getSkillDetails",
  description:
    "Get detailed information for D&D skills including ability scores, typical uses, and examples. Use when players ask about skill checks, proficiencies, or need to understand how a skill works.",
  parameters: [
    {
      name: "skillName",
      type: "string",
      description:
        "Exact name of the skill (e.g., 'Acrobatics', 'Athletics', 'Stealth', 'Persuasion')",
      required: true,
    },
  ],
  execute: createDbLookupTool(SkillModel, "Skill", "skillName"),
};

toolRegistry.register(getSkillDetails);

export { getSkillDetails };
