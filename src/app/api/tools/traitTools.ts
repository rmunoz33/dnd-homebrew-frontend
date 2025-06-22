import { Tool, toolRegistry } from "./registry";

const traitCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour

const getTraitDetails: Tool = {
  name: "getTraitDetails",
  description:
    "Get detailed information for D&D traits including racial traits, class features, and special abilities. Use when players ask about specific traits, abilities, or need to understand trait mechanics.",
  parameters: [
    {
      name: "traitName",
      type: "string",
      description:
        "Exact name of the trait (e.g., 'Darkvision', 'Fey Ancestry', 'Second Wind', 'Sneak Attack')",
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>) => {
    const traitName = params.traitName as string;
    const cacheKey = `trait_${traitName.toLowerCase()}`;
    const cached = traitCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Convert trait name to API index format
      const traitIndex = traitName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const response = await fetch(
        `https://www.dnd5eapi.co/api/2014/traits/${traitIndex}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            error: true,
            message: `Trait "${traitName}" not found. Please check the spelling or try a different trait name.`,
          };
        }
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      traitCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error("Error fetching trait details:", error);
      return {
        error: true,
        message: `Unable to fetch information for "${traitName}". Please try again or ask me to describe it based on my knowledge.`,
      };
    }
  },
};

toolRegistry.register(getTraitDetails);

export { getTraitDetails };
