import { Tool, toolRegistry } from "./registry";

const classCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour

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
    const className = params.className as string;
    const cacheKey = `class_${className.toLowerCase()}`;
    const cached = classCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Convert class name to API index format
      const classIndex = className
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const response = await fetch(
        `https://www.dnd5eapi.co/api/2014/classes/${classIndex}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            error: true,
            message: `Class "${className}" not found. Please check the spelling or try a different class name.`,
          };
        }
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
