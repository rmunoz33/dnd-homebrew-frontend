import { Tool, toolRegistry } from "./registry";

const damageTypeCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour

const getDamageTypeDetails: Tool = {
  name: "getDamageTypeDetails",
  description:
    "Get detailed information for D&D damage types including descriptions, typical sources, and effects. Use when players ask about damage types, resistances, vulnerabilities, or need to understand damage mechanics.",
  parameters: [
    {
      name: "damageTypeName",
      type: "string",
      description:
        "Exact name of the damage type (e.g., 'Slashing', 'Fire', 'Cold', 'Lightning', 'Necrotic', 'Radiant')",
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>) => {
    const damageTypeName = params.damageTypeName as string;
    const cacheKey = `damagetype_${damageTypeName.toLowerCase()}`;
    const cached = damageTypeCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Convert damage type name to API index format
      const damageTypeIndex = damageTypeName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const response = await fetch(
        `https://www.dnd5eapi.co/api/2014/damage-types/${damageTypeIndex}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            error: true,
            message: `Damage type "${damageTypeName}" not found. Please check the spelling or try a different damage type name.`,
          };
        }
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      damageTypeCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error("Error fetching damage type details:", error);
      return {
        error: true,
        message: `Unable to fetch information for "${damageTypeName}". Please try again or ask me to describe it based on my knowledge.`,
      };
    }
  },
};

toolRegistry.register(getDamageTypeDetails);

export { getDamageTypeDetails };
