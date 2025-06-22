import { Tool, toolRegistry } from "./registry";

const spellCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour
let spellList: { index: string; name: string; url: string }[] = [];

// Fetch the list of all spells on startup
const fetchSpellList = async () => {
  if (spellList.length > 0) return;
  try {
    const response = await fetch("https://www.dnd5eapi.co/api/spells");
    const data = await response.json();
    spellList = data.results;
  } catch (error) {
    console.error("Error fetching spell list:", error);
  }
};

const getSpellDetails: Tool = {
  name: "getSpellDetails",
  description:
    "Get detailed information for a D&D spell, including level, school, casting time, range, components, duration, and description.",
  parameters: [
    {
      name: "spellName",
      type: "string",
      description: "Exact name of the spell (e.g., 'Fireball', 'Mage Armor')",
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>) => {
    await fetchSpellList();
    const spellName = params.spellName as string;
    const cacheKey = `spell_${spellName.toLowerCase()}`;
    const cached = spellCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    try {
      const spellInfo = spellList.find(
        (s) => s.name.toLowerCase() === spellName.toLowerCase()
      );

      if (!spellInfo) {
        return {
          error: true,
          message: `Spell \"${spellName}\" not found. Please check the spelling or try a different spell name.`,
        };
      }

      const response = await fetch(`https://www.dnd5eapi.co${spellInfo.url}`);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      const data = await response.json();
      spellCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error("Error fetching spell details:", error);
      return {
        error: true,
        message: `Unable to fetch information for \"${spellName}\". Please try again or ask me to describe it based on my knowledge.`,
      };
    }
  },
};

toolRegistry.register(getSpellDetails);

export { getSpellDetails };
