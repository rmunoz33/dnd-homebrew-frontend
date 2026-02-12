import { Tool, toolRegistry } from "./registry";
import { createDbLookupTool } from "@/lib/db/toolFactory";
import RaceModel from "@/lib/db/models/race";

const getRaceDetails: Tool = {
  name: "getRaceDetails",
  description:
    "Get detailed information for D&D races including traits, abilities, and racial features. Use when players ask about race abilities, want to create characters, or need racial information.",
  parameters: [
    {
      name: "raceName",
      type: "string",
      description:
        "Exact name of the race (e.g., 'Human', 'Elf', 'Dwarf', 'Halfling')",
      required: true,
    },
  ],
  execute: createDbLookupTool(RaceModel, "Race", "raceName"),
};

toolRegistry.register(getRaceDetails);

export { getRaceDetails };
