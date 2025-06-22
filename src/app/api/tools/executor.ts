import { toolRegistry, Tool } from "./index";
import { OpenAI } from "openai";

const client = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY!,
  dangerouslyAllowBrowser: true,
});

interface ToolExecutionResult {
  toolUsed: boolean;
  result?: unknown;
  toolName?: string;
  error?: string;
  allResults?: Array<{ toolName: string; result?: unknown; error?: string }>;
}

/**
 * Generates a tool schema prompt for the LLM from the tool registry
 */
function generateToolSchemaPrompt(): string {
  const tools = toolRegistry.getAllTools();
  return tools
    .map((tool) => {
      const params = tool.parameters
        .map(
          (p) =>
            `${p.name}: ${p.type} - ${p.description} [${
              p.required ? "required" : "optional"
            }]`
        )
        .join(", ");
      return `- ${tool.name}: ${tool.description} Arguments: { ${params} }`;
    })
    .join("\n");
}

/**
 * Analyzes AI response for tool usage intent and executes appropriate tools (AI-driven)
 */
export async function executeToolsFromResponse(
  aiResponse: string,
  userInput: string
): Promise<ToolExecutionResult> {
  const toolSchema = generateToolSchemaPrompt();

  const systemPrompt = `You are an expert D&D assistant. Given the following user input and AI response, decide if any tools should be used. Here are the available tools:\n\n${toolSchema}\n\nReturn a JSON object in this format:\n{ "tools": [{"tool": "getSpellDetails", "args": {"spellName": "Fireball"}}, {"tool": "getMonsterStats", "args": {"monsterName": "Adult Red Dragon"}}] }\nor\n{ "tools": [{"tool": "getSpellDetails", "args": {"spellName": "Fireball"}}] }\nor\n{ "tools": [] } if no tools are needed.\n\nImportant naming conventions:\n- Dragons: Use "Adult Red Dragon", "Young Blue Dragon", "Ancient Gold Dragon", etc. (not "Dragon, Red")\n- Monsters: Use exact names like "Goblin", "Owlbear", "Zombie", "Troll", "Roc"\n- Spells: Use exact names like "Fireball", "Cone of Cold", "Ice Storm", "Cure Wounds", "Mage Armor"\n\nSpell mapping examples:\n- "shoot fire" → "Fireball"\n- "shoot ice" → "Cone of Cold"\n- "heal" → "Cure Wounds"\n- "make armor" → "Mage Armor"\n- "turn invisible" → "Invisibility"`;

  const userPrompt = `User input: "${userInput}"
AI response: "${aiResponse}"`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { toolUsed: false };
    }

    // Log the raw LLM response for debugging
    console.log("Raw LLM tool selection response:", content);

    let parsed: {
      tools: Array<{ tool: string; args?: Record<string, unknown> }>;
    };
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error("Failed to parse LLM response:", err);
      return {
        toolUsed: false,
        error: "Failed to parse LLM tool selection response.",
      };
    }

    if (!parsed.tools || parsed.tools.length === 0) {
      return { toolUsed: false };
    }

    // Execute all selected tools
    const results: Array<{
      toolName: string;
      result?: unknown;
      error?: string;
    }> = [];

    for (const toolSelection of parsed.tools) {
      if (!toolRegistry.hasTool(toolSelection.tool)) {
        results.push({
          toolName: toolSelection.tool,
          error: `Tool '${toolSelection.tool}' is not registered.`,
        });
        continue;
      }

      try {
        const result = await toolRegistry.executeTool(
          toolSelection.tool,
          toolSelection.args || {}
        );
        results.push({
          toolName: toolSelection.tool,
          result,
        });
      } catch (error) {
        results.push({
          toolName: toolSelection.tool,
          error: `Failed to execute tool '${toolSelection.tool}': ${error}`,
        });
      }
    }

    // Return the first successful result (for backward compatibility)
    const successfulResults = results.filter((r) => !r.error);
    if (successfulResults.length > 0) {
      return {
        toolUsed: true,
        result: successfulResults[0].result,
        toolName: successfulResults[0].toolName,
        // Store all results for multi-tool formatting
        allResults: results,
      };
    } else {
      return {
        toolUsed: true,
        error: `All tools failed: ${results.map((r) => r.error).join(", ")}`,
      };
    }
  } catch (error) {
    return { toolUsed: false, error: `LLM tool selection failed: ${error}` };
  }
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
    case "getSpellDetails":
      return formatSpellResult(result);
    case "getEquipmentDetails":
      return formatEquipmentResult(result);
    case "getClassDetails":
      return formatClassResult(result);
    case "getRaceDetails":
      return formatRaceResult(result);
    case "getConditionDetails":
      return formatConditionResult(result);
    case "getSkillDetails":
      return formatSkillResult(result);
    case "getFeatDetails":
      return formatFeatResult(result);
    case "getBackgroundDetails":
      return formatBackgroundResult(result);
    case "getSubclassDetails":
      return formatSubclassResult(result);
    case "getMagicItemDetails":
      return formatMagicItemResult(result);
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

/**
 * Formats spell data for readable display
 */
function formatSpellResult(result: unknown): string {
  if (typeof result !== "object" || result === null) {
    return `\n\n**Spell Data**: Unable to format result`;
  }
  const spell = result as Record<string, any>;
  let formatted = "\n\n**Spell Information**:\n";
  if (spell.name) formatted += `**Name**: ${spell.name}\n`;
  if (spell.level !== undefined)
    formatted += `**Level**: ${spell.level === 0 ? "Cantrip" : spell.level}\n`;
  if (spell.school && spell.school.name)
    formatted += `**School**: ${spell.school.name}\n`;
  if (spell.casting_time)
    formatted += `**Casting Time**: ${spell.casting_time}\n`;
  if (spell.range) formatted += `**Range**: ${spell.range}\n`;
  if (spell.components)
    formatted += `**Components**: ${spell.components.join(", ")}\n`;
  if (spell.material) formatted += `**Material**: ${spell.material}\n`;
  if (spell.duration) formatted += `**Duration**: ${spell.duration}\n`;
  if (spell.concentration)
    formatted += `**Concentration**: ${spell.concentration ? "Yes" : "No"}\n`;
  if (spell.ritual) formatted += `**Ritual**: ${spell.ritual ? "Yes" : "No"}\n`;
  if (spell.classes && Array.isArray(spell.classes)) {
    formatted += `**Classes**: ${spell.classes
      .map((c: any) => c.name)
      .join(", ")}\n`;
  }
  if (spell.desc && Array.isArray(spell.desc)) {
    formatted += `**Description**:\n${spell.desc.join("\n")}\n`;
  }
  if (
    spell.higher_level &&
    Array.isArray(spell.higher_level) &&
    spell.higher_level.length > 0
  ) {
    formatted += `**At Higher Levels**:\n${spell.higher_level.join("\n")}\n`;
  }
  return formatted;
}

/**
 * Formats equipment data for readable display
 */
function formatEquipmentResult(result: unknown): string {
  if (typeof result !== "object" || result === null) {
    return `\n\n**Equipment Data**: Unable to format result`;
  }
  const equipment = result as Record<string, any>;
  let formatted = "\n\n**Equipment Information**:\n";

  if (equipment.name) formatted += `**Name**: ${equipment.name}\n`;
  if (equipment.equipment_category && equipment.equipment_category.name)
    formatted += `**Category**: ${equipment.equipment_category.name}\n`;
  if (equipment.cost)
    formatted += `**Cost**: ${equipment.cost.quantity} ${equipment.cost.unit}\n`;
  if (equipment.weight) formatted += `**Weight**: ${equipment.weight} lb\n`;

  // Weapon properties
  if (equipment.weapon_category)
    formatted += `**Weapon Category**: ${equipment.weapon_category}\n`;
  if (equipment.weapon_range)
    formatted += `**Weapon Range**: ${equipment.weapon_range}\n`;
  if (equipment.damage && equipment.damage.damage_dice) {
    formatted += `**Damage**: ${equipment.damage.damage_dice} ${
      equipment.damage.damage_type?.name || ""
    }\n`;
  }
  if (equipment.properties && Array.isArray(equipment.properties)) {
    formatted += `**Properties**: ${equipment.properties
      .map((p: any) => p.name)
      .join(", ")}\n`;
  }

  // Armor properties
  if (equipment.armor_category)
    formatted += `**Armor Category**: ${equipment.armor_category}\n`;
  if (equipment.armor_class && equipment.armor_class.base) {
    formatted += `**Armor Class**: ${equipment.armor_class.base}`;
    if (equipment.armor_class.dex_bonus !== undefined) {
      formatted += ` + DEX modifier${
        equipment.armor_class.max_bonus
          ? ` (max +${equipment.armor_class.max_bonus})`
          : ""
      }`;
    }
    formatted += "\n";
  }
  if (equipment.str_minimum)
    formatted += `**Strength Requirement**: ${equipment.str_minimum}\n`;
  if (equipment.stealth_disadvantage)
    formatted += `**Stealth Disadvantage**: Yes\n`;

  // Magic item properties
  if (equipment.rarity && equipment.rarity.name)
    formatted += `**Rarity**: ${equipment.rarity.name}\n`;
  if (equipment.desc && Array.isArray(equipment.desc)) {
    formatted += `**Description**:\n${equipment.desc.join("\n")}\n`;
  }

  return formatted;
}

/**
 * Formats class data for readable display
 */
function formatClassResult(result: unknown): string {
  if (typeof result !== "object" || result === null) {
    return `\n\n**Class Data**: Unable to format result`;
  }
  const classData = result as Record<string, any>;
  let formatted = "\n\n**Class Information**:\n";

  if (classData.name) formatted += `**Name**: ${classData.name}\n`;
  if (classData.hit_die) formatted += `**Hit Die**: d${classData.hit_die}\n`;
  if (
    classData.proficiency_choices &&
    Array.isArray(classData.proficiency_choices)
  ) {
    formatted += `**Proficiency Choices**:\n`;
    classData.proficiency_choices.forEach((choice: any, index: number) => {
      formatted += `  ${index + 1}. Choose ${choice.choose} from:\n`;
      if (choice.from && Array.isArray(choice.from)) {
        choice.from.forEach((item: any) => {
          formatted += `    - ${item.name || item}\n`;
        });
      }
    });
  }
  if (classData.proficiencies && Array.isArray(classData.proficiencies)) {
    formatted += `**Proficiencies**: ${classData.proficiencies
      .map((p: any) => p.name)
      .join(", ")}\n`;
  }
  if (classData.saving_throws && Array.isArray(classData.saving_throws)) {
    formatted += `**Saving Throw Proficiencies**: ${classData.saving_throws
      .map((s: any) => s.name)
      .join(", ")}\n`;
  }
  if (
    classData.starting_equipment &&
    Array.isArray(classData.starting_equipment)
  ) {
    formatted += `**Starting Equipment**:\n`;
    classData.starting_equipment.forEach((item: any) => {
      formatted += `  - ${item.equipment?.name || item}\n`;
    });
  }
  if (classData.class_levels) formatted += `**Class Levels**: Available\n`;
  if (classData.spellcasting && classData.spellcasting.spellcasting_ability) {
    formatted += `**Spellcasting Ability**: ${classData.spellcasting.spellcasting_ability.name}\n`;
  }
  if (classData.subclasses && Array.isArray(classData.subclasses)) {
    formatted += `**Subclasses**: ${classData.subclasses
      .map((s: any) => s.name)
      .join(", ")}\n`;
  }

  return formatted;
}

/**
 * Formats race data for readable display
 */
function formatRaceResult(result: unknown): string {
  if (typeof result !== "object" || result === null) {
    return `\n\n**Race Data**: Unable to format result`;
  }
  const race = result as Record<string, any>;
  let formatted = "\n\n**Race Information**:\n";

  if (race.name) formatted += `**Name**: ${race.name}\n`;
  if (race.speed) formatted += `**Speed**: ${race.speed} feet\n`;
  if (race.ability_bonuses && Array.isArray(race.ability_bonuses)) {
    formatted += `**Ability Score Bonuses**:\n`;
    race.ability_bonuses.forEach((bonus: any) => {
      formatted += `  - ${bonus.ability_score.name}: +${bonus.bonus}\n`;
    });
  }
  if (race.age) formatted += `**Age**: ${race.age}\n`;
  if (race.alignment) formatted += `**Alignment**: ${race.alignment}\n`;
  if (race.size) formatted += `**Size**: ${race.size}\n`;
  if (race.size_description)
    formatted += `**Size Description**: ${race.size_description}\n`;
  if (
    race.starting_proficiencies &&
    Array.isArray(race.starting_proficiencies)
  ) {
    formatted += `**Starting Proficiencies**: ${race.starting_proficiencies
      .map((p: any) => p.name)
      .join(", ")}\n`;
  }
  if (race.languages && Array.isArray(race.languages)) {
    formatted += `**Languages**: ${race.languages
      .map((l: any) => l.name)
      .join(", ")}\n`;
  }
  if (race.language_desc)
    formatted += `**Language Description**: ${race.language_desc}\n`;
  if (race.traits && Array.isArray(race.traits)) {
    formatted += `**Traits**:\n`;
    race.traits.forEach((trait: any) => {
      formatted += `  - ${trait.name}\n`;
    });
  }
  if (race.subraces && Array.isArray(race.subraces)) {
    formatted += `**Subraces**: ${race.subraces
      .map((s: any) => s.name)
      .join(", ")}\n`;
  }

  return formatted;
}

/**
 * Formats condition data for readable display
 */
function formatConditionResult(result: unknown): string {
  if (typeof result !== "object" || result === null) {
    return `\n\n**Condition Data**: Unable to format result`;
  }
  const condition = result as Record<string, any>;
  let formatted = "\n\n**Condition Information**:\n";

  if (condition.name) formatted += `**Name**: ${condition.name}\n`;
  if (condition.desc && Array.isArray(condition.desc)) {
    formatted += `**Description**:\n${condition.desc.join("\n")}\n`;
  }

  return formatted;
}

/**
 * Formats skill data for readable display
 */
function formatSkillResult(result: unknown): string {
  if (typeof result !== "object" || result === null) {
    return `\n\n**Skill Data**: Unable to format result`;
  }
  const skill = result as Record<string, any>;
  let formatted = "\n\n**Skill Information**:\n";

  if (skill.name) formatted += `**Name**: ${skill.name}\n`;
  if (skill.desc && Array.isArray(skill.desc)) {
    formatted += `**Description**:\n${skill.desc.join("\n")}\n`;
  }
  if (skill.ability_score && skill.ability_score.name) {
    formatted += `**Ability Score**: ${skill.ability_score.name}\n`;
  }

  return formatted;
}

/**
 * Formats feat data for readable display
 */
function formatFeatResult(result: unknown): string {
  if (typeof result !== "object" || result === null) {
    return `\n\n**Feat Data**: Unable to format result`;
  }
  const feat = result as Record<string, any>;
  let formatted = "\n\n**Feat Information**:\n";

  if (feat.name) formatted += `**Name**: ${feat.name}\n`;
  if (feat.prerequisites && Array.isArray(feat.prerequisites)) {
    formatted += `**Prerequisites**:\n`;
    feat.prerequisites.forEach((prereq: any) => {
      if (prereq.ability_score) {
        formatted += `  - ${prereq.ability_score.name}: ${prereq.minimum_score}\n`;
      }
    });
  }
  if (feat.desc && Array.isArray(feat.desc)) {
    formatted += `**Description**:\n${feat.desc.join("\n")}\n`;
  }

  return formatted;
}

/**
 * Formats background data for readable display
 */
function formatBackgroundResult(result: unknown): string {
  if (typeof result !== "object" || result === null) {
    return `\n\n**Background Data**: Unable to format result`;
  }
  const background = result as Record<string, any>;
  let formatted = "\n\n**Background Information**:\n";

  if (background.name) formatted += `**Name**: ${background.name}\n`;
  if (
    background.starting_proficiencies &&
    Array.isArray(background.starting_proficiencies)
  ) {
    formatted += `**Starting Proficiencies**: ${background.starting_proficiencies
      .map((p: any) => p.name)
      .join(", ")}\n`;
  }
  if (background.language_options) {
    formatted += `**Language Options**: ${background.language_options.choose} from ${background.language_options.from.count} options\n`;
  }
  if (
    background.starting_equipment &&
    Array.isArray(background.starting_equipment)
  ) {
    formatted += `**Starting Equipment**:\n`;
    background.starting_equipment.forEach((item: any) => {
      formatted += `  - ${item.equipment?.name || item}\n`;
    });
  }
  if (background.feature && background.feature.name) {
    formatted += `**Feature**: ${background.feature.name}\n`;
    if (background.feature.desc && Array.isArray(background.feature.desc)) {
      formatted += `**Feature Description**:\n${background.feature.desc.join(
        "\n"
      )}\n`;
    }
  }
  if (background.personality_traits && background.personality_traits.choose) {
    formatted += `**Personality Traits**: Choose ${background.personality_traits.choose} from ${background.personality_traits.from.count} options\n`;
  }
  if (background.ideals && background.ideals.choose) {
    formatted += `**Ideals**: Choose ${background.ideals.choose} from ${background.ideals.from.count} options\n`;
  }
  if (background.bonds && background.bonds.choose) {
    formatted += `**Bonds**: Choose ${background.bonds.choose} from ${background.bonds.from.count} options\n`;
  }
  if (background.flaws && background.flaws.choose) {
    formatted += `**Flaws**: Choose ${background.flaws.choose} from ${background.flaws.from.count} options\n`;
  }

  return formatted;
}

/**
 * Formats subclass data for readable display
 */
function formatSubclassResult(result: unknown): string {
  if (typeof result !== "object" || result === null) {
    return `\n\n**Subclass Data**: Unable to format result`;
  }
  const subclass = result as Record<string, any>;
  let formatted = "\n\n**Subclass Information**:\n";

  if (subclass.name) formatted += `**Name**: ${subclass.name}\n`;
  if (subclass.class && subclass.class.name)
    formatted += `**Class**: ${subclass.class.name}\n`;
  if (subclass.subclass_flavor)
    formatted += `**Flavor**: ${subclass.subclass_flavor}\n`;
  if (subclass.desc && Array.isArray(subclass.desc)) {
    formatted += `**Description**:\n${subclass.desc.join("\n")}\n`;
  }
  if (subclass.spells && Array.isArray(subclass.spells)) {
    formatted += `**Spells**:\n`;
    subclass.spells.forEach((spell: any) => {
      formatted += `  - ${spell.spell.name} (Level ${spell.spell.level})\n`;
    });
  }
  if (subclass.subclass_levels) formatted += `**Subclass Levels**: Available\n`;

  return formatted;
}

/**
 * Formats magic item data for readable display
 */
function formatMagicItemResult(result: unknown): string {
  if (typeof result !== "object" || result === null) {
    return `\n\n**Magic Item Data**: Unable to format result`;
  }
  const item = result as Record<string, any>;
  let formatted = "\n\n**Magic Item Information**:\n";

  if (item.name) formatted += `**Name**: ${item.name}\n`;
  if (item.equipment_category && item.equipment_category.name)
    formatted += `**Category**: ${item.equipment_category.name}\n`;
  if (item.rarity && item.rarity.name)
    formatted += `**Rarity**: ${item.rarity.name}\n`;
  if (item.requires_attunement) formatted += `**Requires Attunement**: Yes\n`;
  if (item.desc && Array.isArray(item.desc)) {
    formatted += `**Description**:\n${item.desc.join("\n")}\n`;
  }
  if (item.variants && Array.isArray(item.variants)) {
    formatted += `**Variants**: ${item.variants
      .map((v: any) => v.name)
      .join(", ")}\n`;
  }

  return formatted;
}
