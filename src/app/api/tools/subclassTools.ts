import { Tool, toolRegistry } from "./registry";
import { DND_API_BASE_URL } from "./config";

const subclassCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour
let subclassList: { index: string; name: string; url: string }[] = [];

// Fetch the list of all subclasses on startup
const fetchSubclassList = async () => {
  if (subclassList.length > 0) return;
  try {
    const response = await fetch(`${DND_API_BASE_URL}/api/subclasses`);
    const data = await response.json();
    subclassList = data.results;
  } catch (error) {
    console.error("Error fetching subclass list:", error);
  }
};

const getSubclassDetails: Tool = {
  name: "getSubclassDetails",
  description:
    "Get detailed information for D&D subclasses including features, abilities, and specializations. Use when players ask about class specializations, want to choose a subclass, or need subclass feature details.",
  parameters: [
    {
      name: "subclassName",
      type: "string",
      description:
        "Exact name of the subclass (e.g., 'Evocation', 'Thief', 'Life Domain', 'Champion')",
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>) => {
    await fetchSubclassList();
    const subclassName = params.subclassName as string;
    const cacheKey = `subclass_${subclassName.toLowerCase()}`;
    const cached = subclassCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const subclassInfo = subclassList.find(
        (s) => s.name.toLowerCase() === subclassName.toLowerCase()
      );

      if (!subclassInfo) {
        return {
          error: true,
          message: `Subclass "${subclassName}" not found. Please check the spelling or try a different subclass name.`,
        };
      }

      const response = await fetch(`${DND_API_BASE_URL}${subclassInfo.url}`);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      subclassCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error("Error fetching subclass details:", error);
      return {
        error: true,
        message: `Unable to fetch information for "${subclassName}". Please try again or ask me to describe it based on my knowledge.`,
      };
    }
  },
};

toolRegistry.register(getSubclassDetails);

export { getSubclassDetails };
