import { Tool, toolRegistry } from "./registry";
import { createDbLookupTool } from "@/lib/db/toolFactory";
import MonsterModel from "@/lib/db/models/monster";

const getMonsterStats: Tool = {
  name: "getMonsterStats",
  description:
    "Get detailed stat block for a D&D monster including HP, AC, attacks, abilities, and lore. Use when player encounters a monster, asks about monster abilities, or needs combat stats.",
  parameters: [
    {
      name: "monsterName",
      type: "string",
      description:
        "Exact name of the monster (e.g., 'Goblin', 'Dragon, Red', 'Orc')",
      required: true,
    },
  ],
  execute: createDbLookupTool(MonsterModel, "Monster", "monsterName"),
};

toolRegistry.register(getMonsterStats);

export { getMonsterStats };
