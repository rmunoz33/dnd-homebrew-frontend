"use server";

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { Character, Message } from "@/stores/useStore";

/**
 * Represents a tool call to be executed client-side
 */
export interface StateToolCall {
  tool: string;
  params: Record<string, unknown>;
}

/**
 * Analyzes the latest game messages to detect character state changes.
 * Returns tool calls that should be executed on the client to update state.
 */
export async function extractStateChanges(
  messages: Message[],
  character: Character
): Promise<StateToolCall[]> {
  // Use last 6 messages (3 exchanges) for context
  const recentMessages = messages.slice(-6);

  if (recentMessages.length < 2) {
    return [];
  }

  // Mark the last two messages as the current exchange
  const conversation = recentMessages
    .map((msg, i) => {
      const role = msg.sender === "user" ? "Player" : "DM";
      const isLatest = i >= recentMessages.length - 2;
      return isLatest
        ? `>>> ${role}: ${msg.content}`
        : `${role}: ${msg.content}`;
    })
    .join("\n\n");

  const systemPrompt = `You are a D&D game state analyzer. Your job is to identify character state changes from the latest exchange (marked with >>> below). Earlier messages are context only.

CHARACTER STATE:
- HP: ${character.hitPoints}/${character.maxHitPoints}
- Gold: ${character.money.gold}, Silver: ${character.money.silver}, Copper: ${character.money.copper}, Electrum: ${character.money.electrum}, Platinum: ${character.money.platinum}
- Equipment: ${[...character.equipment.weapons, ...character.equipment.armor, ...character.equipment.tools, ...character.equipment.magicItems, ...character.equipment.items].join(", ") || "None"}
- XP: ${character.experience}

RECENT CONVERSATION:
${conversation}

# Reasoning Steps

Think step by step:
1. Read the LAST player message and LAST DM message (the most recent exchange, marked >>>)
2. If the player's message is vague (e.g., "I do it again"), use earlier messages to determine what action they took
3. Identify what the player SPENT or CONSUMED to perform their action (coins, items, potions, etc.)
4. Identify what CONSEQUENCES the DM described (damage, healing, items received, XP awarded, etc.)
5. If the DM states a specific number, use it. If not, infer a reasonable amount based on the action described
6. Return ALL changes from the latest exchange — both the player's costs and the DM's consequences

# Inference Guidelines

You may infer reasonable changes when the narrative clearly implies them, even without exact numbers:
- A player swallowing/spending/giving a coin = currency loss (infer 1 if count not stated)
- A player taking damage, getting hurt, or being attacked = HP loss (infer a small amount like 1-3 if not specified)
- A player drinking a potion = item consumed + HP restored
- A player picking up or pocketing something = item gained
- If the DM states a specific number, always use that number instead of inferring

# Anti-Duplication Rules

This is critical — do NOT double-count changes:
- Only report changes from the LATEST exchange (marked >>>)
- If the DM is continuing to describe the aftermath of something that already happened in an earlier exchange, that is NOT a new change
- If the player says "I do it again", that IS a new action — report its costs and consequences as new changes
- Never report the same change twice in one response

# Output Format

Return JSON. If no changes occurred, return: { "tool_calls": [] }

{
  "tool_calls": [
    { "tool": "update_hit_points", "params": { "amount": -5, "reason": "goblin attack" } },
    { "tool": "update_currency", "params": { "currency_type": "gold", "amount": -1, "reason": "coin swallowed" } }
  ]
}

Do NOT return tool calls with amount 0.

# Available Tools

- update_hit_points: { amount: number, reason: string }
- update_currency: { currency_type: "gold"|"silver"|"copper"|"electrum"|"platinum", amount: number, reason: string }
- add_inventory_item: { item_name: string, category: "weapons"|"armor"|"tools"|"magicItems"|"items", reason: string }
- remove_inventory_item: { item_name: string, category: "weapons"|"armor"|"tools"|"magicItems"|"items", reason: string }
- update_experience: { amount: number, reason: string }

# Final Instructions

Report all changes from the latest exchange, including reasonable inferences. But NEVER duplicate changes from earlier exchanges. When unsure if something is a new change or a continuation of an old one, err on the side of not reporting it.`;

  try {
    const { text } = await generateText({
      model: openai("gpt-4.1-mini"),
      system: systemPrompt,
      prompt: "Analyze the latest DM response and report any character state changes as JSON.",
      temperature: 0.1,
    });

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      console.error("Failed to parse state changes JSON. Raw text:", text, parseError);
      return [];
    }
    return parsed.tool_calls || [];
  } catch (error) {
    console.error("Error extracting state changes:", error);
    return [];
  }
}

/**
 * Character data with canonical D&D information attached
 */
interface CharacterWithCanonicalData extends Character {
  canonicalData?: {
    classes?: unknown[];
    race?: unknown;
    background?: unknown;
    subclass?: unknown;
  };
}

/**
 * Generated creative fields for a character
 */
export interface CreativeFields {
  name?: string;
  backStory?: string;
  personality?: string;
  specialAbilities?: string[];
  attributes?: {
    strength?: { value: number; bonus?: number };
    dexterity?: { value: number; bonus?: number };
    constitution?: { value: number; bonus?: number };
    intelligence?: { value: number; bonus?: number };
    wisdom?: { value: number; bonus?: number };
    charisma?: { value: number; bonus?: number };
  };
  money?: { gold: number };
}

/**
 * Generates creative fields for a character using AI.
 * This is called server-side to keep the API key secure.
 */
export async function generateCreativeFields(
  character: CharacterWithCanonicalData
): Promise<CreativeFields> {
  const canonicalData = character.canonicalData || {};

  const creativePrompt = `
You are a D&D character creation expert. Based on the provided character data, fill in the creative fields while respecting the canonical D&D rules.

CHARACTER DATA:
${JSON.stringify(character, null, 2)}

CANONICAL D&D DATA AVAILABLE:
- Classes: ${(canonicalData.classes?.length ?? 0) > 0 ? "Available" : "None specified"}
- Race: ${canonicalData.race ? "Available" : "None specified"}
- Background: ${canonicalData.background ? "Available" : "None specified"}
- Subclass: ${canonicalData.subclass ? "Available" : "None specified"}

TASK: Fill in ONLY the creative fields below. Do NOT invent or change rules data. Use the canonical data to inform your creative choices.

CREATIVE FIELDS TO FILL:
1. backStory: A compelling backstory that fits the character's race, class, and background.
2. personality: Character personality traits and quirks.
3. specialAbilities: An array of 2-3 special ability names (not descriptions) that fit the character's class and level.
4. name: A fitting name for the character (if not already provided).
5. attributes: A JSON object for the character's attributes (strength, dexterity, constitution, intelligence, wisdom, charisma). Assign a value for each between 8 and 18, keeping the character's class in mind.
6. money: A JSON object with a starting 'gold' value, appropriate for the character's background (typically between 10 and 25).

Return ONLY a JSON object with these creative fields. Example:
{
  "name": "Character Name",
  "backStory": "A compelling backstory...",
  "personality": "Character personality...",
  "specialAbilities": ["Ability 1", "Ability 2"],
  "attributes": {
    "strength": { "value": 14 },
    "dexterity": { "value": 16 },
    "constitution": { "value": 12 },
    "intelligence": { "value": 10 },
    "wisdom": { "value": 13 },
    "charisma": { "value": 8 }
  },
  "money": { "gold": 15 }
}`;

  try {
    const { text } = await generateText({
      model: openai("gpt-4.1-nano"),
      system: "You are a D&D character creation expert. Generate creative character elements that fit the provided canonical data.",
      prompt: creativePrompt,
      temperature: 0.7,
    });

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      console.error("Failed to parse creative fields JSON. Raw text:", text, parseError);
      return {};
    }
    return parsed;
  } catch (error) {
    console.error("Error generating creative fields:", error);
    return {};
  }
}

/**
 * Generates a campaign outline for a character.
 */
export async function generateCampaignOutline(
  character: Character,
  toolDescriptions: string,
  toolSchema: string,
  toolCount: number
): Promise<string> {
  const startingLevel = character.level || 1;

  const prompt = `As a D&D campaign designer, create a detailed campaign outline for a solo adventure featuring this character:

${JSON.stringify(character, null, 2)}

AVAILABLE D&D TOOLS (${toolCount} tools):
${toolDescriptions}

TOOL SCHEMA FOR REFERENCE:
${toolSchema}

Use these tools to get accurate information when creating NPCs, enemies, equipment, and campaign elements. You have access to:
- Monster stat blocks and abilities
- Spell details and effects
- Equipment and magic item properties
- Class features and abilities
- Racial traits and features
- Background details and features
- Feat descriptions and prerequisites
- Subclass specializations
- Game rules and mechanics
- Damage types and effects
- Languages and cultural information

Follow this structure:

1. Campaign Overview
- Main plot hook and central conflict
- Setting and atmosphere
- Major themes and tone
- Expected character arc
- Starting level: ${startingLevel}

2. Three-Act Structure (adjust acts and challenges to the starting level)
Act 1 (Starting Level to Midpoint):
- Inciting incident
- Initial challenges and discoveries
- Key NPCs and locations
- First major decision point

Act 2 (Midpoint to Pre-Climax):
- Rising action and complications
- Character development opportunities
- Mid-campaign twist
- Second major decision point

Act 3 (Climax and Resolution):
- Climax and resolution
- Final challenges and revelations
- Character's ultimate test
- Multiple possible endings

3. Key NPCs and Enemies
- Allies and mentors
- Rivals and antagonists
- Their motivations and relationships to the character
- How they can help or hinder the character's goals

4. The Final Confrontation: The Big Baddie
- The main antagonist of the campaign
- Their backstory, motivations, and ultimate goal
- Description of their lair or stronghold
- A detailed D&D 5e-style stat block for the final boss battle

5. Stat Blocks
- For each major NPC and enemy, provide a D&D 5e-style stat block (level-appropriate, including AC, HP, abilities, attacks, and special traits)
- Use the available tools to get accurate monster information when needed
- Consider the character's class and abilities when designing challenges

6. Major Locations
- Important settings and their significance
- Key landmarks and points of interest
- How they connect to the character's journey

7. Side Quests and Optional Content
- Potential side adventures
- Character development opportunities
- Additional rewards and challenges

8. Character Integration
- How the character's background ties into the main plot
- Personal stakes and motivations
- Opportunities for character growth
- Ways to incorporate the character's class and abilities

9. Pacing and Progression
- Expected level progression
- Key milestones and achievements
- Balance of combat, exploration, and social interaction
- Opportunities for character development

10. Campaign Conclusion & Epilogue
- A clear description of what happens after the Big Baddie is defeated.
- A concluding narrative that lets the player know the main adventure is over.
- Suggestions for what the character might do in the future, post-campaign.

Format the response as a detailed markdown document that can be used as a campaign guide.`;

  try {
    const { text } = await generateText({
      model: openai("gpt-4.1-nano"),
      system: "You are an expert D&D campaign designer who creates engaging, character-driven adventures. You have access to comprehensive D&D data through the available tools.",
      prompt,
      temperature: 0.7,
    });

    return text;
  } catch (error) {
    console.error("Error generating campaign outline:", error);
    throw error;
  }
}
