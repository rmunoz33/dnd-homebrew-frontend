import { Tool, toolRegistry } from "./registry";
import { DND_API_BASE_URL } from "./config";

const ruleCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour
let ruleList: { index: string; name: string; url: string }[] = [];

// Fetch the list of all rules on startup
const fetchRuleList = async () => {
  if (ruleList.length > 0) return;
  try {
    const response = await fetch(`${DND_API_BASE_URL}/api/rules`);
    const data = await response.json();
    ruleList = data.results;
  } catch (error) {
    console.error("Error fetching rule list:", error);
  }
};

const getRuleDetails: Tool = {
  name: "getRuleDetails",
  description:
    "Get detailed information for D&D rules including game mechanics, combat rules, and system explanations. Use when players ask about game rules, mechanics, or need clarification on how something works.",
  parameters: [
    {
      name: "ruleName",
      type: "string",
      description:
        "Exact name of the rule or mechanic (e.g., 'Combat', 'Ability Scores', 'Saving Throws', 'Proficiency Bonus')",
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>) => {
    await fetchRuleList();
    const ruleName = params.ruleName as string;
    const cacheKey = `rule_${ruleName.toLowerCase()}`;
    const cached = ruleCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const ruleInfo = ruleList.find(
        (r) => r.name.toLowerCase() === ruleName.toLowerCase()
      );

      if (!ruleInfo) {
        return {
          error: true,
          message: `Rule "${ruleName}" not found. Please check the spelling or try a different rule name.`,
        };
      }

      const response = await fetch(`${DND_API_BASE_URL}${ruleInfo.url}`);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      ruleCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error("Error fetching rule details:", error);
      return {
        error: true,
        message: `Unable to fetch information for "${ruleName}". Please try again or ask me to describe it based on my knowledge.`,
      };
    }
  },
};

toolRegistry.register(getRuleDetails);

export { getRuleDetails };
