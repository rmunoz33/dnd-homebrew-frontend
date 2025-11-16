import { Tool, toolRegistry } from "./registry";
import { DND_API_BASE_URL } from "./config";

const classCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour
let classList: { index: string; name: string; url: string }[] = [];

// Fetch the list of all classes on startup
const fetchClassList = async () => {
  if (classList.length > 0) return;
  try {
    const response = await fetch(`${DND_API_BASE_URL}/api/2014/classes`);
    const data = await response.json();
    classList = data.results;
  } catch (error) {
    console.error("Error fetching class list:", error);
  }
};

const getClassDetails: Tool = {
  name: "getClassDetails",
  description:
    "Get detailed information for D&D classes including features, spellcasting, hit dice, and proficiencies. Use when players ask about class abilities, features, or want to understand a class.",
  parameters: [
    {
      name: "className",
      type: "string",
      description:
        "Exact name of the class (e.g., 'Fighter', 'Wizard', 'Cleric', 'Rogue')",
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>) => {
    await fetchClassList();
    const className = params.className as string;
    const cacheKey = `class_${className.toLowerCase()}`;
    const cached = classCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const classInfo = classList.find(
        (c) => c.name.toLowerCase() === className.toLowerCase()
      );

      if (!classInfo) {
        return {
          error: true,
          message: `Class "${className}" not found. Please check the spelling or try a different class name.`,
        };
      }

      const response = await fetch(`${DND_API_BASE_URL}${classInfo.url}`);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      classCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error("Error fetching class details:", error);
      return {
        error: true,
        message: `Unable to fetch information for "${className}". Please try again or ask me to describe it based on my knowledge.`,
      };
    }
  },
};

toolRegistry.register(getClassDetails);

export { getClassDetails };
