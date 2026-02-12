import { Tool, toolRegistry } from "./registry";
import { createDbLookupTool } from "@/lib/db/toolFactory";
import BackgroundModel from "@/lib/db/models/background";

const getBackgroundDetails: Tool = {
  name: "getBackgroundDetails",
  description:
    "Get detailed information for D&D backgrounds including traits, proficiencies, equipment, and feature descriptions. Use when players ask about character backgrounds, want to choose a background, or need background features.",
  parameters: [
    {
      name: "backgroundName",
      type: "string",
      description:
        "Exact name of the background (e.g., 'Acolyte', 'Criminal', 'Folk Hero', 'Sage')",
      required: true,
    },
  ],
  execute: createDbLookupTool(BackgroundModel, "Background", "backgroundName"),
};

toolRegistry.register(getBackgroundDetails);

export { getBackgroundDetails };
