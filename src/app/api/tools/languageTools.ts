import { Tool, toolRegistry } from "./registry";
import { createDbLookupTool } from "@/lib/db/toolFactory";
import LanguageModel from "@/lib/db/models/language";

const getLanguageDetails: Tool = {
  name: "getLanguageDetails",
  description:
    "Get detailed information for D&D languages including typical speakers, scripts, and language families. Use when players ask about languages, want to learn a language, or need language information for roleplay.",
  parameters: [
    {
      name: "languageName",
      type: "string",
      description:
        "Exact name of the language (e.g., 'Common', 'Elvish', 'Dwarvish', 'Draconic', 'Infernal')",
      required: true,
    },
  ],
  execute: createDbLookupTool(LanguageModel, "Language", "languageName"),
};

toolRegistry.register(getLanguageDetails);

export { getLanguageDetails };
