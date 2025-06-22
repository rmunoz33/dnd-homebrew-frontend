import { Tool, toolRegistry } from "./registry";

const magicItemCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour

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
    const itemName = params.itemName as string;
    const cacheKey = `magicitem_${itemName.toLowerCase()}`;
    const cached = magicItemCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Convert item name to API index format
      const itemIndex = itemName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const response = await fetch(
        `https://www.dnd5eapi.co/api/2014/magic-items/${itemIndex}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            error: true,
            message: `Magic item "${itemName}" not found. Please check the spelling or try a different item name.`,
          };
        }
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
