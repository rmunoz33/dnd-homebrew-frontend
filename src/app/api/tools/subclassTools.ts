import { Tool, toolRegistry } from "./registry";

const subclassCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour

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
    const subclassName = params.subclassName as string;
    const cacheKey = `subclass_${subclassName.toLowerCase()}`;
    const cached = subclassCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Convert subclass name to API index format
      const subclassIndex = subclassName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const response = await fetch(
        `https://www.dnd5eapi.co/api/2014/subclasses/${subclassIndex}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            error: true,
            message: `Subclass "${subclassName}" not found. Please check the spelling or try a different subclass name.`,
          };
        }
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
