import { Tool, toolRegistry } from "./registry";

const raceCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour

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
  execute: async (params: Record<string, unknown>) => {
    const raceName = params.raceName as string;
    const cacheKey = `race_${raceName.toLowerCase()}`;
    const cached = raceCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Convert race name to API index format
      const raceIndex = raceName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const response = await fetch(
        `https://www.dnd5eapi.co/api/2014/races/${raceIndex}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            error: true,
            message: `Race "${raceName}" not found. Please check the spelling or try a different race name.`,
          };
        }
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      raceCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error("Error fetching race details:", error);
      return {
        error: true,
        message: `Unable to fetch information for "${raceName}". Please try again or ask me to describe it based on my knowledge.`,
      };
    }
  },
};

toolRegistry.register(getRaceDetails);

export { getRaceDetails };
