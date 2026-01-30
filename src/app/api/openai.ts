import OpenAI from "openai";
import type { Stream } from "openai/streaming";
import type { ResponseStreamEvent } from "openai/resources/responses/responses";
import { Character, useDnDStore } from "@/stores/useStore";
import {
  toolRegistry,
  formatToolResult,
} from "./tools";
import {
  fetchRaces,
  fetchClasses,
  fetchAlignments,
  fetchBackgrounds,
  fetchSubclassesForClass,
  type RaceOption,
  type ClassOption,
  type AlignmentOption,
  type BackgroundOption,
} from "@/services/api/characterOptions";

const client = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY!,
  dangerouslyAllowBrowser: true,
});

// Type definitions for equipment data
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

// Interfaces for starting_equipment_options
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
  // Further details can be added if choice options are implemented
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
  // Add other properties as needed
}

interface CanonicalData {
  classes?: ClassData[];
  race?: {
    speed?: number;
  };
}

/**
 * Generates character details using a hybrid approach:
 * 1. Fetches canonical D&D data from the tool system for selected fields
 * 2. Uses LLM for creative fields only (backstory, personality, etc.)
 * 3. Merges both for a complete character profile
 */
export const generateCharacterDetails = async (character: Character) => {
  try {
    const filledCharacter = { ...character };

    // Fetch all options from API (except subclasses - those are lazy loaded)
    const [racesData, classesData, alignmentsData, backgroundsData] = await Promise.all([
      fetchRaces().catch(() => []),
      fetchClasses().catch(() => []),
      fetchAlignments().catch(() => []),
      fetchBackgrounds().catch(() => []),
    ]);

    const races = racesData.map((r: RaceOption) => r.name);
    const classes = classesData.map((c: ClassOption) => c.name);
    const alignments = alignmentsData.map((a: AlignmentOption) => a.name);
    const backgrounds = backgroundsData.map((b: BackgroundOption) => b.name);

    // If a field is empty, select a random value from the API options
    if (!filledCharacter.species && races.length > 0) {
      filledCharacter.species = races[Math.floor(Math.random() * races.length)];
    }

    // Note: Subspecies will be handled by fetching race details if needed
    // For now, we'll skip subspecies in auto-generation to avoid API complexity

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
      const subclassesForClass = await fetchSubclassesForClass(classIndex).catch(() => []);
      if (subclassesForClass.length > 0) {
        const subclassNames = subclassesForClass.map(sc => sc.name);
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

    // 3. Use LLM for creative fields only
    const creativePrompt = `
You are a D&D character creation expert. Based on the provided character data, fill in the creative fields while respecting the canonical D&D rules.

CHARACTER DATA:
${JSON.stringify(canonicalCharacter, null, 2)}

CANONICAL D&D DATA AVAILABLE:
- Classes: ${canonicalData.classes.length > 0 ? "Available" : "None specified"}
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

    const response = await client.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "system",
          content:
            "You are a D&D character creation expert. Generate creative character elements that fit the provided canonical data.",
        },
        { role: "user", content: creativePrompt },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const creativeFields = response.choices[0]?.message?.content
      ? JSON.parse(response.choices[0].message.content)
      : {};

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
        enhancedCharacter.attributes.constitution.bonus;
      const dexterityModifier = enhancedCharacter.attributes.dexterity.bonus;

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
            // Using average hit die roll for simplicity
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
                quantity: 1, // Defaulting quantity, as it's not always present
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
                // Otherwise, add the item directly
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
        } else {
          console.log(
            "DEBUG: No equipment to fetch. `equipmentToFetch` array is empty."
          );
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
};

export const generateCampaignOutline = async (character: Character) => {
  const startingLevel = character.level || 1;

  // Get comprehensive tool descriptions for campaign creation
  const toolDescriptions = toolRegistry.generateToolDescriptions();
  const toolSchema = toolRegistry.generateToolSchemaPrompt();

  const prompt = `As a D&D campaign designer, create a detailed campaign outline for a solo adventure featuring this character:

${JSON.stringify(character, null, 2)}

AVAILABLE D&D TOOLS (${toolRegistry.getToolCount()} tools):
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
    const response = await client.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "system",
          content:
            "You are an expert D&D campaign designer who creates engaging, character-driven adventures. You have access to comprehensive D&D data through the available tools.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error generating campaign outline:", error);
    throw error;
  }
};

// Character state update tools - these modify game state directly
const CHARACTER_UPDATE_TOOLS = [
  "update_hit_points",
  "update_currency",
  "add_inventory_item",
  "remove_inventory_item",
  "update_experience",
];

// Track changes applied during streaming to prevent double-application
interface AppliedChange {
  tool: string;
  params: Record<string, unknown>;
}

// Define ResponseInputItem type for the Responses API
type ResponseInputItem =
  | { role: "user" | "assistant" | "system"; content: string }
  | { type: "function_call_output"; call_id: string; output: string };

export const generateChatCompletion = async (): Promise<boolean> => {
  try {
    const {
      inputMessage,
      character,
      messages,
      updateLastMessage,
      campaignOutline,
    } = useDnDStore.getState();

    // System instructions for the DM
    // Calculate proficiency bonus from level
    const proficiencyBonus = Math.floor((character.level - 1) / 4) + 2;

    const instructions = `You are an immersive Dungeon Master running a solo D&D 5e adventure.

<tools>
You have tools to update the character sheet. Use them — do NOT just narrate changes.

When the player's action results in gaining or losing resources, call the appropriate tool:
- update_currency: money changes (spending, tipping, looting, rewards)
- update_hit_points: HP changes (damage, healing)
- add_inventory_item / remove_inventory_item: item changes
- update_experience: XP awards

# Tool calling guidance:
- Coins (gold, silver, copper, etc.) are CURRENCY, not items. Any coin changing hands = update_currency
- If the player's money, HP, items, or XP changes, call the corresponding tool
- Infer reasonable amounts when the player is vague (e.g., "a few coins" = 2-3, "some gold" = 5)
- Always call the tool — the character sheet must stay in sync with the narrative

Call tools silently — never mention them in your narrative.
</tools>

<character>
Name: ${character.name}
Level: ${character.level} (Proficiency Bonus: +${proficiencyBonus})
Class: ${character.classes.join("/")}${character.subClass ? ` (${character.subClass})` : ""}
Species: ${character.species}${character.subspecies ? ` (${character.subspecies})` : ""}
Background: ${character.background}
HP: ${character.hitPoints}/${character.maxHitPoints}
AC: ${character.armorClass}

Ability Scores & Modifiers:
- STR: ${character.attributes.strength.value} (${character.attributes.strength.bonus >= 0 ? "+" : ""}${character.attributes.strength.bonus})
- DEX: ${character.attributes.dexterity.value} (${character.attributes.dexterity.bonus >= 0 ? "+" : ""}${character.attributes.dexterity.bonus})
- CON: ${character.attributes.constitution.value} (${character.attributes.constitution.bonus >= 0 ? "+" : ""}${character.attributes.constitution.bonus})
- INT: ${character.attributes.intelligence.value} (${character.attributes.intelligence.bonus >= 0 ? "+" : ""}${character.attributes.intelligence.bonus})
- WIS: ${character.attributes.wisdom.value} (${character.attributes.wisdom.bonus >= 0 ? "+" : ""}${character.attributes.wisdom.bonus})
- CHA: ${character.attributes.charisma.value} (${character.attributes.charisma.bonus >= 0 ? "+" : ""}${character.attributes.charisma.bonus})

Equipment: ${[...character.equipment.weapons, ...character.equipment.armor, ...character.equipment.tools, ...character.equipment.magicItems, ...character.equipment.items].join(", ") || "None"}
Gold: ${character.money.gold} gp
</character>

<campaign>
${campaignOutline || "No campaign outline available. Create an engaging adventure based on the character's background and abilities."}
</campaign>

<rules>
RESPONSE LENGTH:
- Standard responses: Maximum 80 words
- Combat or major revelations: Maximum 120 words
- Exceeding these limits breaks pacing. Be concise.

DICE ROLLS:
- When a check is needed, tell the player their modifier: "Roll Perception. Your modifier is +${character.attributes.wisdom.bonus}."
- NEVER reveal the DC or possible outcomes before the roll
- NEVER list what different roll results would reveal
- After they roll, narrate the outcome without explaining the DC
- You may offer to roll for them

ACTION RESOLUTION:
- Describe outcomes based on their roll and abilities
- Success feels earned; failure creates complications, not dead ends
- Reference their class features, background, and equipment

PLAYER GUIDANCE:
- If the player seems stuck, have an NPC hint or let the environment suggest a path
- When off-track, creatively guide them back to the story
- Respond to what the player DOES — if they take an action, resolve it
</rules>

<immersion>
NEVER DO THESE:
- Reveal information the character hasn't discovered
- Mention tool calls, stat updates, or game mechanics processing
- Reveal DCs or possible roll outcomes before the player rolls
- Use bullet points or numbered lists in narrative responses
- Generate player dialogue or actions — never write what the player says or does next

DESCRIBING THE PLAYER'S EXPERIENCE:
✓ DO describe physical sensations: "A chill runs down your spine."
✓ DO describe instinctive reactions: "Your hand moves to your blade."
✓ DO describe sensory input: "The air tastes of copper and smoke."
✗ DON'T dictate opinions: "You don't trust him."
✗ DON'T dictate decisions: "You want to go left."

The player decides what they think and choose. You describe the world and how it affects their senses.
</immersion>

<player_engagement>
READ THE PLAYER'S ENERGY:
- Short/confused responses ("okay", "uh", "and now?") = they need guidance, not more prose
- When confused, respond with a direct question or clear choice, not more atmosphere
- Match response length to player engagement — don't overwhelm a hesitant player

OFFERING CHOICES IS GOOD:
- Don't use numbered lists, but DO weave 2-3 clear options into your response
- Example: "The letter names two contacts: Professor Voss at the university, or Seraphine in the undercity. The tunnels wait beneath the cathedral."
- This gives direction while preserving agency

ASKING QUESTIONS IS GOOD:
- "Do you open the seal?" / "Do you go alone, or seek an ally first?"
- Direct questions prompt action and help uncertain players engage
- Avoid vague "What do you do?" — be specific about the immediate choice

WHEN THE PLAYER IS STUCK:
- Don't repeat the scene description
- Offer a concrete next step: "The courier mentioned Professor Voss knows the old tunnels. Her office is a short walk from here."
- NPCs can prompt action: A servant asks, "Shall I summon your carriage, my lord?"
</player_engagement>

<style>
- Present tense, second person
- Clarity over poetry — the player must understand what's happening before appreciating how it feels
- One or two sensory details per response, not a cascade of metaphors
- NPCs speak in quoted dialogue with distinct voices
- Format in markdown
</style>

<campaign_opening>
When starting a new campaign, GROUND THE PLAYER before adding atmosphere:

FIRST (required): In plain language, establish:
- The world: "Welcome to Ashenmoor, a kingdom where magic is feared and inquisitors hunt the gifted."
- The character: "You are Zephyr Voss, a wizard who hides your talents while working as a librarian."
- The situation: "A letter arrived today with a royal seal. The head librarian looks nervous."

THEN (brief): Add one or two sensory details for atmosphere.

FINALLY: End with a direct question: "Do you open the letter?"

Clarity before poetry. The player needs to understand WHERE they are, WHO they are, and WHAT'S HAPPENING before they can engage with the story. Keep it under 100 words.
</campaign_opening>

<answering_questions>
When the player asks a direct question ("Where am I?", "Who is that?", "What's happening?"):
- Answer directly FIRST in plain language
- THEN add brief flavor if appropriate
- Don't bury the answer in atmosphere

✗ WRONG: "The library sighs with ancient whispers, corridors shifting like dreams..."
✓ RIGHT: "You're in the Nexus Library, a magical archive. It's a maze of floating bookshelves. You work here as a researcher."
</answering_questions>

<reminder>
Use your tools to update the character sheet — do NOT just narrate resource changes. If the player spends money, call update_currency. If they take damage, call update_hit_points. Always call the tool, then narrate.
</reminder>`;

    // Convert character state tools to Responses API format
    const filteredTools = toolRegistry.getAllTools().filter(t => CHARACTER_UPDATE_TOOLS.includes(t.name));
    const tools = filteredTools.map((tool) => ({
      type: "function" as const,
      name: tool.name,
      description: tool.description,
      parameters: {
        type: "object" as const,
        properties: tool.parameters.reduce(
          (acc, param) => {
            acc[param.name] = {
              type: param.type,
              description: param.description,
            };
            return acc;
          },
          {} as Record<string, { type: string; description: string }>
        ),
        required: tool.parameters.filter((p) => p.required).map((p) => p.name),
        additionalProperties: false,
      },
      strict: true,
    }));

    // Build input from conversation history
    const input: ResponseInputItem[] = [
      ...messages.map((msg) => ({
        role: (msg.sender === "user" ? "user" : "assistant") as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user" as const, content: inputMessage },
    ];

    let fullContent = "";
    let continueLoop = true;
    let previousResponseId: string | undefined = undefined;
    let pendingFunctionOutputs: Array<{ type: "function_call_output"; call_id: string; output: string }> = [];

    // Track character state changes applied during streaming (for deduplication in post-processing)
    const appliedChanges: AppliedChange[] = [];

    // Agentic loop - continues until we get a text response without tool calls
    while (continueLoop) {
      // Create the streaming response
      let stream: Stream<ResponseStreamEvent>;
      if (previousResponseId && pendingFunctionOutputs.length > 0) {
        // Continuing after function calls - reference previous response and include outputs
        stream = await client.responses.create({
          model: "gpt-4.1-mini",
          tools,
          stream: true,
          previous_response_id: previousResponseId,
          input: pendingFunctionOutputs,
        });
        pendingFunctionOutputs = []; // Clear for next iteration
      } else {
        // First request - include instructions and full input
        stream = await client.responses.create({
          model: "gpt-4.1-mini",
          tools,
          stream: true,
          instructions,
          input,
        });
      }

      // Collect function calls from this response
      const functionCalls: Array<{ call_id: string; name: string; arguments: string }> = [];
      let currentResponseId: string | undefined = undefined;

      for await (const event of stream) {
        // Handle text output deltas
        if (event.type === "response.output_text.delta") {
          fullContent += event.delta;
          updateLastMessage(fullContent);
        }

        // Handle completed response to check for function calls
        if (event.type === "response.completed") {
          const response = event.response;
          currentResponseId = response.id;

          // Check each output item for function calls
          for (const item of response.output) {
            if (item.type === "function_call") {
              functionCalls.push({
                call_id: item.call_id,
                name: item.name,
                arguments: item.arguments,
              });
            }
          }
        }
      }

      // If we have function calls, execute them and prepare outputs for next iteration
      if (functionCalls.length > 0) {
        for (const fc of functionCalls) {
          try {
            const args = JSON.parse(fc.arguments || "{}");
            const result = await toolRegistry.executeTool(fc.name, args);

            // For D&D reference tools (non-character updates), append the result to content
            const isCharacterUpdate = CHARACTER_UPDATE_TOOLS.includes(fc.name);
            if (!isCharacterUpdate && result) {
              const formattedResult = formatToolResult(fc.name, result);
              fullContent += formattedResult;
              updateLastMessage(fullContent);
            }

            // Track character state tool calls for deduplication
            if (isCharacterUpdate) {
              appliedChanges.push({ tool: fc.name, params: args });
            }

            // Queue the function output for the next request
            pendingFunctionOutputs.push({
              type: "function_call_output",
              call_id: fc.call_id,
              output: JSON.stringify(result),
            });
          } catch (error) {
            console.error(`Error executing tool ${fc.name}:`, error);
            pendingFunctionOutputs.push({
              type: "function_call_output",
              call_id: fc.call_id,
              output: JSON.stringify({ error: String(error) }),
            });
          }
        }

        // Update previous response ID for the next iteration
        previousResponseId = currentResponseId;
      } else {
        // No function calls, we're done
        continueLoop = false;
      }
    }

    // Run fallback state extraction to catch changes the model didn't track via tools
    // This uses the character tools (with toasts) and skips already-applied changes
    await extractStateChangesFromNarrative(appliedChanges);

    return true;
  } catch (error) {
    console.error("Error in chat route:", error);
    useDnDStore
      .getState()
      .updateLastMessage("Sorry, I encountered an error. Please try again.");
    return false;
  }
};

/**
 * Post-processing fallback for state extraction.
 *
 * Analyzes the last DM response to detect character state changes that weren't
 * tracked via tool calls during streaming. This hybrid approach is industry-standard
 * for AI game state management.
 *
 * The function:
 * 1. Takes the applied changes from streaming (to avoid duplicates)
 * 2. Asks a fast model to identify any state changes (HP, currency, items, XP)
 * 3. Filters out changes that were already applied
 * 4. Calls the actual character tools (with toasts) for remaining changes
 */
const extractStateChangesFromNarrative = async (appliedChanges: AppliedChange[]) => {
  const { character, messages } = useDnDStore.getState();
  const lastTwoMessages = messages.slice(-2);

  if (lastTwoMessages.length < 2) {
    return null;
  }

  // Build a summary of what was already applied for the prompt
  const alreadyAppliedSummary = appliedChanges.length > 0
    ? `ALREADY APPLIED (do NOT include these):\n${appliedChanges.map(c => `- ${c.tool}: ${JSON.stringify(c.params)}`).join('\n')}`
    : "";

  const systemPrompt = `You are a D&D game state analyzer. Your job is to detect when the player's resources change.

CHARACTER STATE:
- Gold: ${character.money.gold}, Silver: ${character.money.silver}, Copper: ${character.money.copper}
- HP: ${character.hitPoints}/${character.maxHitPoints}

CONVERSATION:
Player: ${lastTwoMessages[0]?.content || ""}
DM: ${lastTwoMessages[1]?.content || ""}

${alreadyAppliedSummary}

CURRENCY CHANGES - track ANY of these:
- Coins thrown, tossed, or dropped (even as a distraction or test)
- Coins given, tipped, or bribed
- Coins spent or paid
- Coins found, looted, or received
- If the player says they throw/toss/give X coins, that's -X currency

HP CHANGES - track ANY of these:
- Damage taken from attacks, traps, or effects
- Healing from potions, spells, or rest

ITEM CHANGES - track ANY of these:
- Items picked up, found, purchased, or received
- Items dropped, sold, given away, or consumed

Return JSON. If no changes, return: { "tool_calls": [] }

FORMAT:
{
  "tool_calls": [
    { "tool": "update_currency", "params": { "currency_type": "gold", "amount": -2, "reason": "thrown at door" } }
  ]
}

IMPORTANT:
- If the player said they threw/tossed coins and the DM narrated the coins landing/clattering, that IS a currency loss. Track it.
- If the player says "coins" without specifying type, default to "gold".
- The player's stated number is the amount (e.g., "2 coins" = amount: -2).`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Analyze the conversation and report any character state changes that need to be tracked." },
      ],
      temperature: 0.1, // Low temp for deterministic extraction
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return null;
    }

    const parsed = JSON.parse(content);

    if (parsed.tool_calls && parsed.tool_calls.length > 0) {
      // Filter out any changes that match already-applied ones
      const newToolCalls = parsed.tool_calls.filter((tc: { tool: string; params: Record<string, unknown> }) => {
        // Check if this change was already applied
        const isDuplicate = appliedChanges.some(applied => {
          if (applied.tool !== tc.tool) return false;

          // For currency, check if same type and similar amount
          if (tc.tool === "update_currency") {
            return applied.params.currency_type === tc.params.currency_type &&
                   applied.params.amount === tc.params.amount;
          }
          // For HP, check if same amount
          if (tc.tool === "update_hit_points") {
            return applied.params.amount === tc.params.amount;
          }
          // For items, check if same item name
          if (tc.tool === "add_inventory_item" || tc.tool === "remove_inventory_item") {
            return (applied.params.item_name as string)?.toLowerCase() ===
                   (tc.params.item_name as string)?.toLowerCase();
          }
          // For XP, check if same amount
          if (tc.tool === "update_experience") {
            return applied.params.amount === tc.params.amount;
          }
          return false;
        });

        return !isDuplicate;
      });

      // Execute the remaining tool calls using the actual character tools
      for (const tc of newToolCalls) {
        try {
          await toolRegistry.executeTool(tc.tool, tc.params);
        } catch (error) {
          console.error(`[extractStateChangesFromNarrative] Error executing ${tc.tool}:`, error);
        }
      }

      return { applied: newToolCalls.length };
    }

    return null;
  } catch (error) {
    console.error("[extractStateChangesFromNarrative] Error:", error);
    return null;
  }
};
