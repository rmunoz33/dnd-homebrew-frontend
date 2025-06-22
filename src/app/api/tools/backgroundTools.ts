import { Tool, toolRegistry } from "./registry";

const backgroundCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour

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
  execute: async (params: Record<string, unknown>) => {
    const backgroundName = params.backgroundName as string;
    const cacheKey = `background_${backgroundName.toLowerCase()}`;
    const cached = backgroundCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Convert background name to API index format
      const backgroundIndex = backgroundName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const response = await fetch(
        `https://www.dnd5eapi.co/api/2014/backgrounds/${backgroundIndex}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            error: true,
            message: `Background "${backgroundName}" not found. Please check the spelling or try a different background name.`,
          };
        }
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      backgroundCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error("Error fetching background details:", error);
      return {
        error: true,
        message: `Unable to fetch information for "${backgroundName}". Please try again or ask me to describe it based on my knowledge.`,
      };
    }
  },
};

toolRegistry.register(getBackgroundDetails);

export { getBackgroundDetails };
