import { Tool, toolRegistry } from "./registry";
import { DND_API_BASE_URL } from "./config";

const damageTypeCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour
let damageTypeList: { index: string; name: string; url: string }[] = [];

// Fetch the list of all damage types on startup
const fetchDamageTypeList = async () => {
  if (damageTypeList.length > 0) return;
  try {
    const response = await fetch(`${DND_API_BASE_URL}/api/damage-types`);
    const data = await response.json();
    damageTypeList = data.results;
  } catch (error) {
    console.error("Error fetching damage type list:", error);
  }
};

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
    await fetchDamageTypeList();
    const damageTypeName = params.damageTypeName as string;
    const cacheKey = `damagetype_${damageTypeName.toLowerCase()}`;
    const cached = damageTypeCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const damageTypeInfo = damageTypeList.find(
        (d) => d.name.toLowerCase() === damageTypeName.toLowerCase()
      );

      if (!damageTypeInfo) {
        return {
          error: true,
          message: `Damage type "${damageTypeName}" not found. Please check the spelling or try a different damage type name.`,
        };
      }

      const response = await fetch(`${DND_API_BASE_URL}${damageTypeInfo.url}`);

      if (!response.ok) {
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
