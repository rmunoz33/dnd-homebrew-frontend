import { Tool, toolRegistry } from "./registry";
import { DND_API_BASE_URL } from "./config";

const conditionCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour
let conditionList: { index: string; name: string; url: string }[] = [];

// Fetch the list of all conditions on startup
const fetchConditionList = async () => {
  if (conditionList.length > 0) return;
  try {
    const response = await fetch(`${DND_API_BASE_URL}/api/2014/conditions`);
    const data = await response.json();
    conditionList = data.results;
  } catch (error) {
    console.error("Error fetching condition list:", error);
  }
};

const getConditionDetails: Tool = {
  name: "getConditionDetails",
  description:
    "Get detailed information for D&D conditions including effects, immunities, and how to remove them. Use when players ask about status effects, conditions, or need to understand what a condition does.",
  parameters: [
    {
      name: "conditionName",
      type: "string",
      description:
        "Exact name of the condition (e.g., 'Poisoned', 'Paralyzed', 'Invisible', 'Blinded')",
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>) => {
    await fetchConditionList();
    const conditionName = params.conditionName as string;
    const cacheKey = `condition_${conditionName.toLowerCase()}`;
    const cached = conditionCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const conditionInfo = conditionList.find(
        (c) => c.name.toLowerCase() === conditionName.toLowerCase()
      );

      if (!conditionInfo) {
        return {
          error: true,
          message: `Condition "${conditionName}" not found. Please check the spelling or try a different condition name.`,
        };
      }

      const response = await fetch(`${DND_API_BASE_URL}${conditionInfo.url}`);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      conditionCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error("Error fetching condition details:", error);
      return {
        error: true,
        message: `Unable to fetch information for "${conditionName}". Please try again or ask me to describe it based on my knowledge.`,
      };
    }
  },
};

toolRegistry.register(getConditionDetails);

export { getConditionDetails };
