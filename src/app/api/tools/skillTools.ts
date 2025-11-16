import { Tool, toolRegistry } from "./registry";
import { DND_API_BASE_URL } from "./config";

const skillCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour
let skillList: { index: string; name: string; url: string }[] = [];

// Fetch the list of all skills on startup
const fetchSkillList = async () => {
  if (skillList.length > 0) return;
  try {
    const response = await fetch(`${DND_API_BASE_URL}/api/2014/skills`);
    const data = await response.json();
    skillList = data.results;
  } catch (error) {
    console.error("Error fetching skill list:", error);
  }
};

const getSkillDetails: Tool = {
  name: "getSkillDetails",
  description:
    "Get detailed information for D&D skills including ability scores, typical uses, and examples. Use when players ask about skill checks, proficiencies, or need to understand how a skill works.",
  parameters: [
    {
      name: "skillName",
      type: "string",
      description:
        "Exact name of the skill (e.g., 'Acrobatics', 'Athletics', 'Stealth', 'Persuasion')",
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>) => {
    await fetchSkillList();
    const skillName = params.skillName as string;
    const cacheKey = `skill_${skillName.toLowerCase()}`;
    const cached = skillCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const skillInfo = skillList.find(
        (s) => s.name.toLowerCase() === skillName.toLowerCase()
      );

      if (!skillInfo) {
        return {
          error: true,
          message: `Skill "${skillName}" not found. Please check the spelling or try a different skill name.`,
        };
      }

      const response = await fetch(`${DND_API_BASE_URL}${skillInfo.url}`);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      skillCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error("Error fetching skill details:", error);
      return {
        error: true,
        message: `Unable to fetch information for "${skillName}". Please try again or ask me to describe it based on my knowledge.`,
      };
    }
  },
};

toolRegistry.register(getSkillDetails);

export { getSkillDetails };
