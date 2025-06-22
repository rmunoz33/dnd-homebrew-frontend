import { Tool, toolRegistry } from "./registry";

const languageCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour

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
  execute: async (params: Record<string, unknown>) => {
    const languageName = params.languageName as string;
    const cacheKey = `language_${languageName.toLowerCase()}`;
    const cached = languageCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Convert language name to API index format
      const languageIndex = languageName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const response = await fetch(
        `https://www.dnd5eapi.co/api/2014/languages/${languageIndex}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            error: true,
            message: `Language "${languageName}" not found. Please check the spelling or try a different language name.`,
          };
        }
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      languageCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error("Error fetching language details:", error);
      return {
        error: true,
        message: `Unable to fetch information for "${languageName}". Please try again or ask me to describe it based on my knowledge.`,
      };
    }
  },
};

toolRegistry.register(getLanguageDetails);

export { getLanguageDetails };
