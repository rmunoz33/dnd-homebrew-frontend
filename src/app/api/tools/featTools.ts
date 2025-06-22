import { Tool, toolRegistry } from "./registry";

const featCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour

const getFeatDetails: Tool = {
  name: "getFeatDetails",
  description:
    "Get detailed information for D&D feats including prerequisites, benefits, and special abilities. Use when players ask about character feats, want to choose feats, or need to understand feat mechanics.",
  parameters: [
    {
      name: "featName",
      type: "string",
      description:
        "Exact name of the feat (e.g., 'Alert', 'Lucky', 'Sharpshooter', 'War Caster')",
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>) => {
    const featName = params.featName as string;
    const cacheKey = `feat_${featName.toLowerCase()}`;
    const cached = featCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Convert feat name to API index format
      const featIndex = featName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const response = await fetch(
        `https://www.dnd5eapi.co/api/2014/feats/${featIndex}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            error: true,
            message: `Feat "${featName}" not found. Please check the spelling or try a different feat name.`,
          };
        }
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      featCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error("Error fetching feat details:", error);
      return {
        error: true,
        message: `Unable to fetch information for "${featName}". Please try again or ask me to describe it based on my knowledge.`,
      };
    }
  },
};

toolRegistry.register(getFeatDetails);

export { getFeatDetails };
