import { Tool, toolRegistry } from "./registry";
import { DND_API_BASE_URL } from "./config";

const equipmentCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour
let equipmentList: { index: string; name: string; url: string }[] = [];

// Fetch the list of all equipment on startup
const fetchEquipmentList = async () => {
  if (equipmentList.length > 0) return;
  try {
    const response = await fetch(`${DND_API_BASE_URL}/api/equipment`);
    const data = await response.json();
    equipmentList = data.results;
  } catch (error) {
    console.error("Error fetching equipment list:", error);
  }
};

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
    await fetchEquipmentList();
    const itemName = params.itemName as string;
    const cacheKey = `equipment_${itemName.toLowerCase()}`;
    const cached = equipmentCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      let itemInfo = equipmentList.find(
        (e) => e.index === itemName.toLowerCase()
      );

      if (!itemInfo) {
        itemInfo = equipmentList.find(
          (e) => e.name.toLowerCase() === itemName.toLowerCase()
        );
      }

      if (!itemInfo) {
        return {
          error: true,
          message: `Equipment "${itemName}" not found. Please check the spelling or try a different item name.`,
        };
      }

      const response = await fetch(`${DND_API_BASE_URL}${itemInfo.url}`);

      if (!response.ok) {
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
