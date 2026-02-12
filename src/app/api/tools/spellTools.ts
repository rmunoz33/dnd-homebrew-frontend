import { Tool, toolRegistry } from "./registry";
import { createDbLookupTool } from "@/lib/db/toolFactory";
import SpellModel from "@/lib/db/models/spell";

const getSpellDetails: Tool = {
  name: "getSpellDetails",
  description:
    "Get detailed information for a D&D spell, including level, school, casting time, range, components, duration, and description.",
  parameters: [
    {
      name: "spellName",
      type: "string",
      description:
        "Exact name of the spell (e.g., 'Fireball', 'Mage Armor')",
      required: true,
    },
  ],
  execute: createDbLookupTool(SpellModel, "Spell", "spellName"),
};

toolRegistry.register(getSpellDetails);

export { getSpellDetails };
