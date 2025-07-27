import { Tool, toolRegistry } from "./registry";
import { DND_API_BASE_URL } from "./config";

const traitCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour
let traitList: { index: string; name: string; url: string }[] = [];

// Fetch the list of all traits on startup
const fetchTraitList = async () => {
  if (traitList.length > 0) return;
  try {
    const response = await fetch(`${DND_API_BASE_URL}/api/traits`);
    const data = await response.json();
    traitList = data.results;
  } catch (error) {
    console.error("Error fetching trait list:", error);
  }
};

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
    await fetchTraitList();
    const traitName = params.traitName as string;
    const cacheKey = `trait_${traitName.toLowerCase()}`;
    const cached = traitCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const traitInfo = traitList.find(
        (t) => t.name.toLowerCase() === traitName.toLowerCase()
      );

      if (!traitInfo) {
        return {
          error: true,
          message: `Trait "${traitName}" not found. Please check the spelling or try a different trait name.`,
        };
      }

      const response = await fetch(`${DND_API_BASE_URL}${traitInfo.url}`);

      if (!response.ok) {
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
