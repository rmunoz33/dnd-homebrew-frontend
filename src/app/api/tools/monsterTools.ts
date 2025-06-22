import { Tool, toolRegistry } from "./registry";

// Simple in-memory cache for frequently accessed data
const monsterCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

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
    const monsterName = params.monsterName as string;

    // Check cache first
    const cacheKey = `monster_${monsterName.toLowerCase()}`;
    const cached = monsterCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Call the 5e-bits API
      const response = await fetch(
        `https://api.5e-bits.com/monsters/${encodeURIComponent(monsterName)}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            error: true,
            message: `Monster "${monsterName}" not found. Please check the spelling or try a different monster name.`,
          };
        }
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
