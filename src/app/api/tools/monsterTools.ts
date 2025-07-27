import { Tool, toolRegistry } from "./registry";
import { DND_API_BASE_URL, transformApiUrl, getListUrl } from "./config";

// Simple in-memory cache for frequently accessed data
const monsterCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour in milliseconds
let monsterList: { index: string; name: string; url: string }[] = [];

// Fetch the list of all monsters on startup
const fetchMonsterList = async () => {
  if (monsterList.length > 0) return;
  try {
    const response = await fetch(
      `${DND_API_BASE_URL}${getListUrl("monsters")}`
    );
    const data = await response.json();
    monsterList = data.results;
  } catch (error) {
    console.error("Error fetching monster list:", error);
  }
};

const getMonsterStats: Tool = {
  name: "getMonsterStats",
  description:
    "Get detailed stat block for a D&D monster including HP, AC, attacks, abilities, and lore. Use when player encounters a monster, asks about monster abilities, or needs combat stats.",
  parameters: [
    {
      name: "monsterName",
      type: "string",
      description:
        "Exact name of the monster (e.g., 'Goblin', 'Dragon, Red', 'Orc')",
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>) => {
    await fetchMonsterList();
    const monsterName = params.monsterName as string;

    // Check cache first
    const cacheKey = `monster_${monsterName.toLowerCase()}`;
    const cached = monsterCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const monsterInfo = monsterList.find(
        (m) => m.name.toLowerCase() === monsterName.toLowerCase()
      );

      if (!monsterInfo) {
        return {
          error: true,
          message: `Monster "${monsterName}" not found. Please check the spelling or try a different monster name.`,
        };
      }

      const response = await fetch(
        `${DND_API_BASE_URL}${transformApiUrl(monsterInfo.url)}`
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();

      // Cache the result
      monsterCache.set(cacheKey, { data, timestamp: Date.now() });

      return data;
    } catch (error) {
      console.error("Error fetching monster stats:", error);
      return {
        error: true,
        message: `Unable to fetch information for "${monsterName}". Please try again or ask me to describe it based on my knowledge.`,
      };
    }
  },
};

// Register the tool
toolRegistry.register(getMonsterStats);

export { getMonsterStats };
