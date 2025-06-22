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

  const systemPrompt = `You are an expert D&D assistant. Given the following user input and AI response, decide if a tool should be used. Here are the available tools:\n\n${toolSchema}\n\nReturn a JSON object in this format:\n{ "tool": "getSpellDetails", "args": { "spellName": "Fireball" } }\nor\n{ "tool": "getMonsterStats", "args": { "monsterName": "Owlbear" } }\nor\n{ "tool": null }`;

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
      max_tokens: 200,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { toolUsed: false };
    }

    // Log the raw LLM response for debugging
    console.log("Raw LLM tool selection response:", content);

    let parsed: { tool: string | null; args?: Record<string, unknown> };
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error("Failed to parse LLM response:", err);
      return {
        toolUsed: false,
        error: "Failed to parse LLM tool selection response.",
      };
    }
    if (!parsed.tool) {
      return { toolUsed: false };
    }
    if (!toolRegistry.hasTool(parsed.tool)) {
      return {
        toolUsed: false,
        error: `Tool '${parsed.tool}' is not registered.`,
      };
    }
    try {
      const result = await toolRegistry.executeTool(
        parsed.tool,
        parsed.args || {}
      );
      return {
        toolUsed: true,
        result,
        toolName: parsed.tool,
      };
    } catch (error) {
      return {
        toolUsed: true,
        error: `Failed to execute tool '${parsed.tool}': ${error}`,
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
