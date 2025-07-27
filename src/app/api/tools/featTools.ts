import { Tool, toolRegistry } from "./registry";
import { DND_API_BASE_URL } from "./config";

const featCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour
let featList: { index: string; name: string; url: string }[] = [];

// Fetch the list of all feats on startup
const fetchFeatList = async () => {
  if (featList.length > 0) return;
  try {
    const response = await fetch(`${DND_API_BASE_URL}/api/2014/feats`);
    const data = await response.json();
    featList = data.results;
  } catch (error) {
    console.error("Error fetching feat list:", error);
  }
};

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
    await fetchFeatList();
    const featName = params.featName as string;
    const cacheKey = `feat_${featName.toLowerCase()}`;
    const cached = featCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const featInfo = featList.find(
        (f) => f.name.toLowerCase() === featName.toLowerCase()
      );

      if (!featInfo) {
        return {
          error: true,
          message: `Feat "${featName}" not found. Please check the spelling or try a different feat name.`,
        };
      }

      const response = await fetch(`${DND_API_BASE_URL}${featInfo.url}`);

      if (!response.ok) {
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
