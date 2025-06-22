import { Tool, toolRegistry } from "./registry";

const equipmentCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour

const getEquipmentDetails: Tool = {
  name: "getEquipmentDetails",
  description:
    "Get detailed information for D&D equipment including weapons, armor, magic items, and gear. Use when players ask about items, want to buy equipment, or need item stats.",
  parameters: [
    {
      name: "itemName",
      type: "string",
      description:
        "Exact name of the equipment item (e.g., 'Longsword', 'Plate Armor', 'Potion of Healing')",
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>) => {
    const itemName = params.itemName as string;
    const cacheKey = `equipment_${itemName.toLowerCase()}`;
    const cached = equipmentCache.get(cacheKey);

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
        `https://www.dnd5eapi.co/api/2014/equipment/${itemIndex}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            error: true,
            message: `Equipment "${itemName}" not found. Please check the spelling or try a different item name.`,
          };
        }
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      equipmentCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error("Error fetching equipment details:", error);
      return {
        error: true,
        message: `Unable to fetch information for "${itemName}". Please try again or ask me to describe it based on my knowledge.`,
      };
    }
  },
};

toolRegistry.register(getEquipmentDetails);

export { getEquipmentDetails };
