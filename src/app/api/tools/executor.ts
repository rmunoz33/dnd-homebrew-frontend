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
  // Common monster names to look for (ordered by length, longest first)
  const commonMonsters = [
    "ancient red dragon",
    "ancient blue dragon",
    "ancient green dragon",
    "ancient black dragon",
    "ancient white dragon",
    "ancient brass dragon",
    "ancient bronze dragon",
    "ancient copper dragon",
    "ancient gold dragon",
    "ancient silver dragon",
    "adult red dragon",
    "adult blue dragon",
    "adult green dragon",
    "adult black dragon",
    "adult white dragon",
    "adult brass dragon",
    "adult bronze dragon",
    "adult copper dragon",
    "adult gold dragon",
    "adult silver dragon",
    "young red dragon",
    "young blue dragon",
    "young green dragon",
    "young black dragon",
    "young white dragon",
    "young brass dragon",
    "young bronze dragon",
    "young copper dragon",
    "young gold dragon",
    "young silver dragon",
    "red dragon wyrmling",
    "blue dragon wyrmling",
    "green dragon wyrmling",
    "black dragon wyrmling",
    "white dragon wyrmling",
    "brass dragon wyrmling",
    "bronze dragon wyrmling",
    "copper dragon wyrmling",
    "gold dragon wyrmling",
    "silver dragon wyrmling",
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

  // Look for exact monster names (longest first)
  for (const monster of commonMonsters) {
    if (text.includes(monster)) {
      // Convert to API format (lowercase, hyphenated)
      return monster.replace(/\s+/g, "-");
    }
  }

  // Look for "a" or "an" followed by a potential monster name
  const articleMatch = text.match(/(?:a|an)\s+([a-z\s]+?)(?:\s|$|\.|,)/);
  if (articleMatch) {
    const potentialMonster = articleMatch[1].trim();
    if (potentialMonster.length > 3) {
      // Avoid short words like "a cat"
      return potentialMonster.replace(/\s+/g, "-");
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

  const monster = result as Record<string, any>;

  let formatted = "\n\n**Monster Information**:\n";

  if (monster.name) formatted += `**Name**: ${monster.name}\n`;
  if (monster.size) formatted += `**Size**: ${monster.size}\n`;
  if (monster.type) formatted += `**Type**: ${monster.type}\n`;
  if (monster.alignment) formatted += `**Alignment**: ${monster.alignment}\n`;

  // Armor Class formatting
  if (monster.armor_class) {
    if (Array.isArray(monster.armor_class)) {
      const acs = monster.armor_class
        .map((ac: any) => {
          let desc = `${ac.value}`;
          if (ac.armor && Array.isArray(ac.armor)) {
            desc += ` (${ac.armor.map((a: any) => a.name).join(", ")})`;
          }
          if (ac.type && !ac.armor) {
            desc += ` (${ac.type})`;
          }
          return desc;
        })
        .join(", ");
      formatted += `**Armor Class**: ${acs}\n`;
    } else {
      formatted += `**Armor Class**: ${monster.armor_class}\n`;
    }
  }

  if (monster.hit_points)
    formatted += `**Hit Points**: ${monster.hit_points}\n`;

  // Speed formatting
  if (monster.speed && typeof monster.speed === "object") {
    const speeds = Object.entries(monster.speed)
      .map(([type, value]) => `${type}: ${value}`)
      .join(", ");
    formatted += `**Speed**: ${speeds}\n`;
  } else if (monster.speed) {
    formatted += `**Speed**: ${monster.speed}\n`;
  }

  if (monster.strength) formatted += `**STR**: ${monster.strength}`;
  if (monster.dexterity) formatted += ` **DEX**: ${monster.dexterity}`;
  if (monster.constitution) formatted += ` **CON**: ${monster.constitution}`;
  if (monster.intelligence) formatted += ` **INT**: ${monster.intelligence}`;
  if (monster.wisdom) formatted += ` **WIS**: ${monster.wisdom}`;
  if (monster.charisma) formatted += ` **CHA**: ${monster.charisma}\n`;

  // Proficiencies
  if (
    monster.proficiencies &&
    Array.isArray(monster.proficiencies) &&
    monster.proficiencies.length > 0
  ) {
    const profs = monster.proficiencies
      .map((p: any) => {
        const name = p.proficiency?.name || "";
        const value = p.value !== undefined ? `+${p.value}` : "";
        return `${name} ${value}`.trim();
      })
      .join(", ");
    formatted += `**Proficiencies**: ${profs}\n`;
  }

  // Senses
  if (monster.senses && typeof monster.senses === "object") {
    const senses = Object.entries(monster.senses)
      .map(([sense, value]) => `${sense.replace(/_/g, " ")}: ${value}`)
      .join(", ");
    formatted += `**Senses**: ${senses}\n`;
  }

  // Languages
  if (monster.languages) formatted += `**Languages**: ${monster.languages}\n`;

  // Challenge Rating
  if (monster.challenge_rating)
    formatted += `**Challenge Rating**: ${monster.challenge_rating}\n`;

  // Actions (detailed)
  if (monster.actions && Array.isArray(monster.actions)) {
    formatted += `**Actions**:\n`;
    monster.actions.forEach((action: any) => {
      formatted += `- ${action.name}`;
      if (action.attack_bonus !== undefined)
        formatted += ` (Attack Bonus: +${action.attack_bonus})`;
      if (
        action.damage &&
        Array.isArray(action.damage) &&
        action.damage.length > 0
      ) {
        const dmg = action.damage
          .map((d: any) =>
            `${d.damage_dice || ""} ${d.damage_type?.name || ""}`.trim()
          )
          .join(", ");
        formatted += `, Damage: ${dmg}`;
      }
      if (action.desc) formatted += `\n  ${action.desc}`;
      formatted += "\n";
    });
  }

  // Special Abilities
  if (monster.special_abilities && Array.isArray(monster.special_abilities)) {
    formatted += `**Special Abilities**:\n`;
    monster.special_abilities.forEach((ability: any) => {
      formatted += `- ${ability.name}`;
      if (ability.desc) formatted += `: ${ability.desc}`;
      formatted += "\n";
    });
  }

  // Legendary Actions
  if (
    monster.legendary_actions &&
    Array.isArray(monster.legendary_actions) &&
    monster.legendary_actions.length > 0
  ) {
    formatted += `**Legendary Actions**:\n`;
    monster.legendary_actions.forEach((action: any) => {
      formatted += `- ${action.name}`;
      if (action.desc) formatted += `: ${action.desc}`;
      formatted += "\n";
    });
  }

  // Damage vulnerabilities, resistances, immunities, condition immunities
  if (
    monster.damage_vulnerabilities &&
    monster.damage_vulnerabilities.length > 0
  ) {
    formatted += `**Damage Vulnerabilities**: ${monster.damage_vulnerabilities.join(
      ", "
    )}\n`;
  }
  if (monster.damage_resistances && monster.damage_resistances.length > 0) {
    formatted += `**Damage Resistances**: ${monster.damage_resistances.join(
      ", "
    )}\n`;
  }
  if (monster.damage_immunities && monster.damage_immunities.length > 0) {
    formatted += `**Damage Immunities**: ${monster.damage_immunities.join(
      ", "
    )}\n`;
  }
  if (monster.condition_immunities && monster.condition_immunities.length > 0) {
    const conds = monster.condition_immunities
      .map((c: any) => c.name || c)
      .join(", ");
    formatted += `**Condition Immunities**: ${conds}\n`;
  }

  return formatted;
}
