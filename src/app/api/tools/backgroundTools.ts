import { Tool, toolRegistry } from "./registry";
import { DND_API_BASE_URL } from "./config";

const backgroundCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour
let backgroundList: { index: string; name: string; url: string }[] = [];

// Fetch the list of all backgrounds on startup
const fetchBackgroundList = async () => {
  if (backgroundList.length > 0) return;
  try {
    const response = await fetch(`${DND_API_BASE_URL}/api/backgrounds`);
    const data = await response.json();
    backgroundList = data.results;
  } catch (error) {
    console.error("Error fetching background list:", error);
  }
};

const getBackgroundDetails: Tool = {
  name: "getBackgroundDetails",
  description:
    "Get detailed information for D&D backgrounds including traits, proficiencies, equipment, and feature descriptions. Use when players ask about character backgrounds, want to choose a background, or need background features.",
  parameters: [
    {
      name: "backgroundName",
      type: "string",
      description:
        "Exact name of the background (e.g., 'Acolyte', 'Criminal', 'Folk Hero', 'Sage')",
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>) => {
    await fetchBackgroundList();
    const backgroundName = params.backgroundName as string;
    const cacheKey = `background_${backgroundName.toLowerCase()}`;
    const cached = backgroundCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const backgroundInfo = backgroundList.find(
        (b) => b.name.toLowerCase() === backgroundName.toLowerCase()
      );

      if (!backgroundInfo) {
        return {
          error: true,
          message: `Background "${backgroundName}" not found. Please check the spelling or try a different background name.`,
        };
      }

      const response = await fetch(`${DND_API_BASE_URL}${backgroundInfo.url}`);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      backgroundCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error("Error fetching background details:", error);
      return {
        error: true,
        message: `Unable to fetch information for "${backgroundName}". Please try again or ask me to describe it based on my knowledge.`,
      };
    }
  },
};

toolRegistry.register(getBackgroundDetails);

export { getBackgroundDetails };
