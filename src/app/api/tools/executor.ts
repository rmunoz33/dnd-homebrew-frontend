import { toolRegistry } from "./registry";

interface ToolExecutionResult {
  toolUsed: boolean;
  result?: unknown;
  toolName?: string;
  error?: string;
}

/**
 * Analyzes AI response for tool usage intent and executes appropriate tools
 */
export async function executeToolsFromResponse(
  aiResponse: string,
  userInput: string
): Promise<ToolExecutionResult> {
  const tools = toolRegistry.getAllTools();

  // Check for monster-related queries
  if (shouldUseMonsterTool(aiResponse, userInput)) {
    const monsterName = extractMonsterName(userInput, aiResponse);
    if (monsterName) {
      try {
        const result = await toolRegistry.executeTool("getMonsterStats", {
          monsterName,
        });
        return {
          toolUsed: true,
          result,
          toolName: "getMonsterStats",
        };
      } catch (error) {
        return {
          toolUsed: true,
          error: `Failed to fetch monster data: ${error}`,
        };
      }
    }
  }

  return { toolUsed: false };
}

/**
 * Determines if the AI response indicates a need for monster data
 */
function shouldUseMonsterTool(aiResponse: string, userInput: string): boolean {
  const monsterKeywords = [
    "monster",
    "creature",
    "beast",
    "dragon",
    "goblin",
    "orc",
    "troll",
    "ogre",
    "goblin",
    "kobold",
    "hobgoblin",
    "bugbear",
    "gnoll",
    "lizardfolk",
    "orc",
    "troll",
    "ogre",
    "giant",
    "dragon",
    "wyvern",
    "griffon",
    "manticore",
    "basilisk",
    "cockatrice",
    "gargoyle",
    "ghost",
    "ghoul",
    "wraith",
    "specter",
    "vampire",
    "werewolf",
    "lycanthrope",
    "medusa",
    "minotaur",
    "centaur",
    "satyr",
    "dryad",
    "nymph",
    "fairy",
    "pixie",
    "sprite",
    "imp",
    "quasit",
    "succubus",
    "incubus",
    "demon",
    "devil",
    "angel",
    "celestial",
  ];

  const userLower = userInput.toLowerCase();
  const responseLower = aiResponse.toLowerCase();

  // Check if user is asking about a specific monster
  return monsterKeywords.some(
    (keyword) => userLower.includes(keyword) || responseLower.includes(keyword)
  );
}

/**
 * Extracts monster name from user input or AI response
 */
function extractMonsterName(
  userInput: string,
  aiResponse: string
): string | null {
  // Common monster names to look for
  const commonMonsters = [
    "goblin",
    "orc",
    "troll",
    "ogre",
    "dragon",
    "wyvern",
    "griffon",
    "manticore",
    "basilisk",
    "cockatrice",
    "gargoyle",
    "ghost",
    "ghoul",
    "wraith",
    "specter",
    "vampire",
    "werewolf",
    "medusa",
    "minotaur",
    "centaur",
    "satyr",
    "dryad",
    "nymph",
    "fairy",
    "pixie",
    "sprite",
    "imp",
    "quasit",
    "succubus",
    "incubus",
  ];

  const text = `${userInput} ${aiResponse}`.toLowerCase();

  // Look for exact monster names
  for (const monster of commonMonsters) {
    if (text.includes(monster)) {
      return monster.charAt(0).toUpperCase() + monster.slice(1);
    }
  }

  // Look for "a" or "an" followed by a potential monster name
  const articleMatch = text.match(/(?:a|an)\s+([a-z]+)/);
  if (articleMatch) {
    const potentialMonster = articleMatch[1];
    if (potentialMonster.length > 3) {
      // Avoid short words like "a cat"
      return (
        potentialMonster.charAt(0).toUpperCase() + potentialMonster.slice(1)
      );
    }
  }

  return null;
}

/**
 * Formats tool result for inclusion in AI response
 */
export function formatToolResult(toolName: string, result: unknown): string {
  if (typeof result === "object" && result !== null && "error" in result) {
    return `\n\n**Tool Error**: ${(result as { error: string }).error}`;
  }

  switch (toolName) {
    case "getMonsterStats":
      return formatMonsterResult(result);
    default:
      return `\n\n**Tool Result**: ${JSON.stringify(result, null, 2)}`;
  }
}

/**
 * Formats monster data for readable display
 */
function formatMonsterResult(result: unknown): string {
  if (typeof result !== "object" || result === null) {
    return `\n\n**Monster Data**: Unable to format result`;
  }

  const monster = result as Record<string, unknown>;

  let formatted = "\n\n**Monster Information**:\n";

  if (monster.name) formatted += `**Name**: ${monster.name}\n`;
  if (monster.size) formatted += `**Size**: ${monster.size}\n`;
  if (monster.type) formatted += `**Type**: ${monster.type}\n`;
  if (monster.alignment) formatted += `**Alignment**: ${monster.alignment}\n`;
  if (monster.armor_class)
    formatted += `**Armor Class**: ${monster.armor_class}\n`;
  if (monster.hit_points)
    formatted += `**Hit Points**: ${monster.hit_points}\n`;
  if (monster.speed) formatted += `**Speed**: ${monster.speed}\n`;

  if (monster.strength) formatted += `**STR**: ${monster.strength}`;
  if (monster.dexterity) formatted += ` **DEX**: ${monster.dexterity}`;
  if (monster.constitution) formatted += ` **CON**: ${monster.constitution}`;
  if (monster.intelligence) formatted += ` **INT**: ${monster.intelligence}`;
  if (monster.wisdom) formatted += ` **WIS**: ${monster.wisdom}`;
  if (monster.charisma) formatted += ` **CHA**: ${monster.charisma}\n`;

  if (monster.actions && Array.isArray(monster.actions)) {
    formatted += `**Actions**: ${monster.actions
      .map((action: any) => action.name)
      .join(", ")}\n`;
  }

  if (monster.special_abilities && Array.isArray(monster.special_abilities)) {
    formatted += `**Special Abilities**: ${monster.special_abilities
      .map((ability: any) => ability.name)
      .join(", ")}\n`;
  }

  return formatted;
}
