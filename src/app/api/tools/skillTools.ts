import { Tool, toolRegistry } from "./registry";

const skillCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour

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
    const skillName = params.skillName as string;
    const cacheKey = `skill_${skillName.toLowerCase()}`;
    const cached = skillCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Convert skill name to API index format
      const skillIndex = skillName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const response = await fetch(
        `https://www.dnd5eapi.co/api/2014/skills/${skillIndex}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            error: true,
            message: `Skill "${skillName}" not found. Please check the spelling or try a different skill name.`,
          };
        }
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
