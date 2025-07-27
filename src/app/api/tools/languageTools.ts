import { Tool, toolRegistry } from "./registry";
import { DND_API_BASE_URL, transformApiUrl, getListUrl } from "./config";

const languageCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour
let languageList: { index: string; name: string; url: string }[] = [];

// Fetch the list of all languages on startup
const fetchLanguageList = async () => {
  if (languageList.length > 0) return;
  try {
    const response = await fetch(
      `${DND_API_BASE_URL}${getListUrl("languages")}`
    );
    const data = await response.json();
    languageList = data.results;
  } catch (error) {
    console.error("Error fetching language list:", error);
  }
};

const getLanguageDetails: Tool = {
  name: "getLanguageDetails",
  description:
    "Get detailed information for D&D languages including typical speakers, scripts, and language families. Use when players ask about languages, want to learn a language, or need language information for roleplay.",
  parameters: [
    {
      name: "languageName",
      type: "string",
      description:
        "Exact name of the language (e.g., 'Common', 'Elvish', 'Dwarvish', 'Draconic', 'Infernal')",
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>) => {
    await fetchLanguageList();
    const languageName = params.languageName as string;
    const cacheKey = `language_${languageName.toLowerCase()}`;
    const cached = languageCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const languageInfo = languageList.find(
        (l) => l.name.toLowerCase() === languageName.toLowerCase()
      );

      if (!languageInfo) {
        return {
          error: true,
          message: `Language "${languageName}" not found. Please check the spelling or try a different language name.`,
        };
      }

      const response = await fetch(
        `${DND_API_BASE_URL}${transformApiUrl(languageInfo.url)}`
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      languageCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error("Error fetching language details:", error);
      return {
        error: true,
        message: `Unable to fetch information for "${languageName}". Please try again or ask me to describe it based on my knowledge.`,
      };
    }
  },
};

toolRegistry.register(getLanguageDetails);

export { getLanguageDetails };
