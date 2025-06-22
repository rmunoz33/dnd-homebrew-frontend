import { Tool, toolRegistry } from "./registry";

const magicItemCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour
let magicItemList: { index: string; name: string; url: string }[] = [];

// Fetch the list of all magic items on startup
const fetchMagicItemList = async () => {
  if (magicItemList.length > 0) return;
  try {
    const response = await fetch("https://www.dnd5eapi.co/api/magic-items");
    const data = await response.json();
    magicItemList = data.results;
  } catch (error) {
    console.error("Error fetching magic item list:", error);
  }
};

const getMagicItemDetails: Tool = {
  name: "getMagicItemDetails",
  description:
    "Get detailed information for D&D magic items including rarity, attunement, properties, and special abilities. Use when players ask about magic items, find treasure, or need magic item mechanics.",
  parameters: [
    {
      name: "itemName",
      type: "string",
      description:
        "Exact name of the magic item (e.g., 'Sword of Sharpness', 'Ring of Protection', 'Potion of Healing', 'Staff of Power')",
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>) => {
    await fetchMagicItemList();
    const itemName = params.itemName as string;
    const cacheKey = `magicitem_${itemName.toLowerCase()}`;
    const cached = magicItemCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const itemInfo = magicItemList.find(
        (i) => i.name.toLowerCase() === itemName.toLowerCase()
      );

      if (!itemInfo) {
        return {
          error: true,
          message: `Magic item "${itemName}" not found. Please check the spelling or try a different item name.`,
        };
      }

      const response = await fetch(`https://www.dnd5eapi.co${itemInfo.url}`);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      magicItemCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error("Error fetching magic item details:", error);
      return {
        error: true,
        message: `Unable to fetch information for "${itemName}". Please try again or ask me to describe it based on my knowledge.`,
      };
    }
  },
};

toolRegistry.register(getMagicItemDetails);

export { getMagicItemDetails };
