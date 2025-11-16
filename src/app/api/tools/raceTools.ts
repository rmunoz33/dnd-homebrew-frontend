import { Tool, toolRegistry } from "./registry";
import { DND_API_BASE_URL } from "./config";

const raceCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour
let raceList: { index: string; name: string; url: string }[] = [];

// Fetch the list of all races on startup
const fetchRaceList = async () => {
  if (raceList.length > 0) return;
  try {
    const response = await fetch(`${DND_API_BASE_URL}/api/2014/races`);
    const data = await response.json();
    raceList = data.results;
  } catch (error) {
    console.error("Error fetching race list:", error);
  }
};

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
    await fetchRaceList();
    const raceName = params.raceName as string;
    const cacheKey = `race_${raceName.toLowerCase()}`;
    const cached = raceCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const raceInfo = raceList.find(
        (r) => r.name.toLowerCase() === raceName.toLowerCase()
      );

      if (!raceInfo) {
        return {
          error: true,
          message: `Race "${raceName}" not found. Please check the spelling or try a different race name.`,
        };
      }

      const response = await fetch(`${DND_API_BASE_URL}${raceInfo.url}`);

      if (!response.ok) {
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
