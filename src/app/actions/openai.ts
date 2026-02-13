"use server";

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { Character, Message } from "@/stores/useStore";
import { toolRegistry } from "@/app/api/tools/server";
import { connectDB } from "@/lib/db/connection";
import RaceModel from "@/lib/db/models/race";
import ClassModel from "@/lib/db/models/class";
import AlignmentModel from "@/lib/db/models/alignment";
import BackgroundModel from "@/lib/db/models/background";
import SubclassModel from "@/lib/db/models/subclass";

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
  character: Character
): Promise<string> {
  const toolDescriptions = toolRegistry.generateToolDescriptions();
  const toolSchema = toolRegistry.generateToolSchemaPrompt();
  const toolCount = toolRegistry.getToolCount();
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

// Type definitions for equipment data used in generateCharacterDetails
interface EquipmentItem {
  name: string;
  index: string;
  equipment_category?: {
    index: string;
  };
}

interface EquipmentChoice {
  equipment?: EquipmentItem;
  equipment_option?: {
    choose: Array<{
      item?: EquipmentItem;
      equipment?: EquipmentItem;
    }>;
  };
}

interface EquipmentReference {
  index: string;
  name: string;
  url: string;
}

interface CountedReference {
  option_type: "counted_reference";
  count: number;
  of: EquipmentReference;
}

interface ChoiceOption {
  option_type: "choice";
}

interface StartingEquipmentFromOption {
  option_set_type: "options_array";
  options: (CountedReference | ChoiceOption)[];
}

interface StartingEquipmentOption {
  desc: string;
  choose: number;
  type: string;
  from: StartingEquipmentFromOption;
}

interface ClassData {
  starting_equipment?: EquipmentChoice[];
  starting_equipment_options?: StartingEquipmentOption[];
  hit_die?: number;
}

interface DndApiEquipment {
  name: string;
  equipment_category?: {
    index: string;
  };
  gear_category?: {
    index: string;
  };
  contents?: Array<{
    item: {
      name: string;
    };
    quantity: number;
  }>;
}

interface CanonicalData {
  classes?: ClassData[];
  race?: {
    speed?: number;
  };
}

/**
 * Generates character details using a hybrid approach:
 * 1. Fetches canonical D&D data from the DB for selected fields
 * 2. Uses LLM (via server action) for creative fields only (backstory, personality, etc.)
 * 3. Merges both for a complete character profile
 */
export async function generateCharacterDetails(character: Character) {
  try {
    const filledCharacter = { ...character };

    // Fetch all options directly from DB (server-side)
    await connectDB();
    const [racesData, classesData, alignmentsData, backgroundsData] = await Promise.all([
      RaceModel.find({}).select({ name: 1, _id: 0 }).sort({ index: 'asc' }).lean(),
      ClassModel.find({}).select({ name: 1, _id: 0 }).sort({ index: 'asc' }).lean(),
      AlignmentModel.find({}).select({ name: 1, _id: 0 }).sort({ index: 'asc' }).lean(),
      BackgroundModel.find({}).select({ name: 1, _id: 0 }).sort({ index: 'asc' }).lean(),
    ]);

    const races = racesData.map((r) => r.name);
    const classes = classesData.map((c) => c.name);
    const alignments = alignmentsData.map((a) => a.name);
    const backgrounds = backgroundsData.map((b) => b.name);

    // If a field is empty, select a random value from the DB options
    if (!filledCharacter.species && races.length > 0) {
      filledCharacter.species = races[Math.floor(Math.random() * races.length)];
    }

    if (!filledCharacter.background && backgrounds.length > 0) {
      filledCharacter.background = backgrounds[Math.floor(Math.random() * backgrounds.length)];
    }

    if (!filledCharacter.alignment && alignments.length > 0) {
      filledCharacter.alignment = alignments[Math.floor(Math.random() * alignments.length)];
    }

    if (!filledCharacter.classes || filledCharacter.classes.length === 0) {
      if (classes.length > 0) {
        filledCharacter.classes = [classes[Math.floor(Math.random() * classes.length)]];
      }
    }

    // Lazy load subclasses only for the main class if needed
    const mainClass = filledCharacter.classes[0];
    if (!filledCharacter.subClass && mainClass) {
      const classIndex = mainClass.toLowerCase().replace(/\s+/g, '-');
      const subclassesData = await SubclassModel
        .find({ 'class.url': `/api/2014/classes/${classIndex}` })
        .select({ name: 1, _id: 0 })
        .sort({ index: 'asc' })
        .lean();
      if (subclassesData.length > 0) {
        const subclassNames = subclassesData.map(sc => sc.name);
        filledCharacter.subClass = subclassNames[Math.floor(Math.random() * subclassNames.length)];
      }
    }

    // 1. Fetch canonical data for each selected field using the tool system
    const canonicalDataPromises = [];

    // Fetch class data if specified
    if (filledCharacter.classes && filledCharacter.classes.length > 0) {
      for (const className of filledCharacter.classes) {
        canonicalDataPromises.push(
          toolRegistry.executeTool("getClassDetails", { className })
        );
      }
    }

    // Fetch race data if specified
    if (filledCharacter.species) {
      canonicalDataPromises.push(
        toolRegistry.executeTool("getRaceDetails", {
          raceName: filledCharacter.species,
        })
      );
    }

    // Fetch background data if specified
    if (filledCharacter.background) {
      canonicalDataPromises.push(
        toolRegistry.executeTool("getBackgroundDetails", {
          backgroundName: filledCharacter.background,
        })
      );
    }

    // Fetch subclass data if specified
    if (filledCharacter.subClass) {
      canonicalDataPromises.push(
        toolRegistry.executeTool("getSubclassDetails", {
          subclassName: filledCharacter.subClass,
        })
      );
    }

    // Wait for all canonical data to be fetched
    const canonicalResults = await Promise.allSettled(canonicalDataPromises);

    // Process results and extract successful data
    const canonicalData = {
      classes: canonicalResults
        .filter(
          (result, index) =>
            result.status === "fulfilled" &&
            index < (filledCharacter.classes?.length || 0)
        )
        .map((result) => (result as PromiseFulfilledResult<unknown>).value),
      race:
        canonicalResults.find(
          (result, index) =>
            result.status === "fulfilled" &&
            index >= (filledCharacter.classes?.length || 0) &&
            index < (filledCharacter.classes?.length || 0) + 1
        )?.status === "fulfilled"
          ? (
              canonicalResults.find(
                (result, index) =>
                  result.status === "fulfilled" &&
                  index >= (filledCharacter.classes?.length || 0) &&
                  index < (filledCharacter.classes?.length || 0) + 1
              ) as PromiseFulfilledResult<unknown>
            ).value
          : null,
      background:
        canonicalResults.find(
          (result, index) =>
            result.status === "fulfilled" &&
            index >= (filledCharacter.classes?.length || 0) + 1 &&
            index < (filledCharacter.classes?.length || 0) + 2
        )?.status === "fulfilled"
          ? (
              canonicalResults.find(
                (result, index) =>
                  result.status === "fulfilled" &&
                  index >= (filledCharacter.classes?.length || 0) + 1 &&
                  index < (filledCharacter.classes?.length || 0) + 2
              ) as PromiseFulfilledResult<unknown>
            ).value
          : null,
      subclass:
        canonicalResults.find(
          (result, index) =>
            result.status === "fulfilled" &&
            index >= (filledCharacter.classes?.length || 0) + 2
        )?.status === "fulfilled"
          ? (
              canonicalResults.find(
                (result, index) =>
                  result.status === "fulfilled" &&
                  index >= (filledCharacter.classes?.length || 0) + 2
              ) as PromiseFulfilledResult<unknown>
            ).value
          : null,
    };

    // 2. Compose canonical character data
    const canonicalCharacter = {
      ...filledCharacter,
      canonicalData,
    };

    // 3. Use LLM for creative fields (keeps API key server-side)
    const creativeFields = await generateCreativeFields(canonicalCharacter);

    // 4. Merge canonical data with creative fields
    const enhancedCharacter = {
      ...canonicalCharacter,
      ...creativeFields,
      // Ensure arrays and objects are properly initialized
      specialAbilities: creativeFields.specialAbilities || [],
      classes: filledCharacter.classes || [],
      attributes: {
        ...filledCharacter.attributes,
        ...creativeFields.attributes,
      },
      money: { ...filledCharacter.money, ...creativeFields.money },
    };

    // Calculate attribute bonuses based on the new values
    for (const attr in enhancedCharacter.attributes) {
      const attribute = attr as keyof typeof enhancedCharacter.attributes;
      if (
        typeof enhancedCharacter.attributes[attribute] === "object" &&
        enhancedCharacter.attributes[attribute] !== null &&
        "value" in enhancedCharacter.attributes[attribute]
      ) {
        const value = enhancedCharacter.attributes[attribute].value;
        enhancedCharacter.attributes[attribute].bonus = Math.floor(
          (value - 10) / 2
        );
      }
    }

    // 5. Calculate Combat Stats
    if (
      enhancedCharacter.level &&
      enhancedCharacter.attributes.constitution &&
      enhancedCharacter.attributes.dexterity &&
      enhancedCharacter.canonicalData
    ) {
      const constitutionModifier =
        enhancedCharacter.attributes.constitution.bonus as number;
      const dexterityModifier = enhancedCharacter.attributes.dexterity.bonus as number;

      // Initiative
      enhancedCharacter.initiative = dexterityModifier;

      // Speed (from race data)
      if (
        (enhancedCharacter.canonicalData as CanonicalData).race &&
        (enhancedCharacter.canonicalData as CanonicalData).race!.speed
      ) {
        enhancedCharacter.speed = (
          enhancedCharacter.canonicalData as CanonicalData
        ).race!.speed!;
      }

      // Armor Class (base calculation, does not include armor)
      enhancedCharacter.armorClass = 10 + dexterityModifier;

      // Hit Points
      if (
        (enhancedCharacter.canonicalData as CanonicalData).classes &&
        (enhancedCharacter.canonicalData as CanonicalData).classes!.length > 0
      ) {
        const mainClassData = (enhancedCharacter.canonicalData as CanonicalData)
          .classes![0];
        if (mainClassData && mainClassData.hit_die) {
          // Level 1 HP
          let totalHp = mainClassData.hit_die + constitutionModifier;

          // HP for levels 2 through 'level'
          if (enhancedCharacter.level > 1) {
            const averageHitDie = Math.floor(mainClassData.hit_die / 2) + 1;
            totalHp +=
              (enhancedCharacter.level - 1) *
              (averageHitDie + constitutionModifier);
          }
          enhancedCharacter.hitPoints = Math.max(1, totalHp);
          enhancedCharacter.maxHitPoints = Math.max(1, totalHp);
        }
      }
    }

    // 6. Equip Starting Equipment from Class Data
    if (
      enhancedCharacter.canonicalData &&
      (enhancedCharacter as Character & { canonicalData: CanonicalData })
        .canonicalData.classes &&
      (enhancedCharacter as Character & { canonicalData: CanonicalData })
        .canonicalData.classes!.length > 0
    ) {
      const mainClassData = (
        enhancedCharacter as Character & { canonicalData: CanonicalData }
      ).canonicalData.classes![0];
      if (mainClassData) {
        const equipmentToFetch: { index: string; quantity: number }[] = [];

        // Process guaranteed equipment from starting_equipment
        if (mainClassData.starting_equipment) {
          mainClassData.starting_equipment.forEach((item) => {
            if (item.equipment) {
              equipmentToFetch.push({
                index: item.equipment.index,
                quantity: 1,
              });
            }
          });
        }

        // Process equipment options, choosing the first valid option
        if (mainClassData.starting_equipment_options) {
          mainClassData.starting_equipment_options.forEach((option) => {
            const choice = option.from?.options?.[0];
            if (choice?.option_type === "counted_reference") {
              equipmentToFetch.push({
                index: choice.of.index,
                quantity: choice.count,
              });
            }
          });
        }

        // Fetch details for all equipment to determine their category
        if (equipmentToFetch.length > 0) {
          const equipmentDetailsPromises = equipmentToFetch.map((item) =>
            toolRegistry.executeTool("getEquipmentDetails", {
              itemName: item.index,
            })
          );
          const equipmentResults = await Promise.allSettled(
            equipmentDetailsPromises
          );

          // Reset equipment and start with "Unarmed Strike"
          enhancedCharacter.equipment = {
            weapons: ["Unarmed Strike"],
            armor: [],
            tools: [],
            magicItems: [],
            items: [],
          };

          equipmentResults.forEach((result, i) => {
            if (result.status === "fulfilled" && result.value) {
              const equipmentData = result.value as DndApiEquipment & {
                error?: boolean;
              };
              if (equipmentData.error) {
                return;
              }

              // If the item is a pack, unpack its contents
              if (
                equipmentData.gear_category?.index === "equipment-packs" &&
                equipmentData.contents
              ) {
                equipmentData.contents.forEach((contentItem) => {
                  for (let k = 0; k < contentItem.quantity; k++) {
                    enhancedCharacter.equipment.items.push(
                      contentItem.item.name
                    );
                  }
                });
              } else {
                const { quantity } = equipmentToFetch[i];
                const itemName = equipmentData.name;
                let categoryKey: keyof Character["equipment"] = "items";
                const apiCategory = equipmentData.equipment_category?.index;
                if (apiCategory === "weapon") {
                  categoryKey = "weapons";
                } else if (apiCategory === "armor") {
                  categoryKey = "armor";
                } else if (
                  apiCategory === "tools" ||
                  equipmentData.gear_category?.index === "tools"
                ) {
                  categoryKey = "tools";
                }
                for (let j = 0; j < quantity; j++) {
                  enhancedCharacter.equipment[categoryKey].push(itemName);
                }
              }
            }
          });
        }
      }
    }

    return enhancedCharacter;
  } catch (error) {
    console.error("Error generating character details:", error);

    // Fallback: return character with basic enhancements
    return {
      ...character,
      specialAbilities: character.specialAbilities || [],
      classes: character.classes || [],
      backStory:
        character.backStory ||
        "A mysterious adventurer with a past shrouded in secrecy.",
      personality:
        "Determined and resourceful, this character faces challenges with courage and wit.",
    };
  }
}
