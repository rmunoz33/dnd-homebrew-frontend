import OpenAI from "openai";
import { Character, useDnDStore, Message } from "@/stores/useStore";
import {
  toolRegistry,
  executeToolsFromResponse,
  formatToolResult,
} from "./tools";
import {
  fetchRaces,
  fetchClasses,
  fetchAlignments,
  fetchBackgrounds,
  fetchSubclasses,
  type RaceOption,
  type ClassOption,
  type AlignmentOption,
  type BackgroundOption,
  type SubclassOption,
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

    // Fetch all options from API
    const [racesData, classesData, alignmentsData, backgroundsData, subclassesData] = await Promise.all([
      fetchRaces().catch(() => []),
      fetchClasses().catch(() => []),
      fetchAlignments().catch(() => []),
      fetchBackgrounds().catch(() => []),
      fetchSubclasses().catch(() => []),
    ]);

    const races = racesData.map((r: RaceOption) => r.name);
    const classes = classesData.map((c: ClassOption) => c.name);
    const alignments = alignmentsData.map((a: AlignmentOption) => a.name);
    const backgrounds = backgroundsData.map((b: BackgroundOption) => b.name);
    
    // Group subclasses by parent class
    const subclassesByClass: Record<string, string[]> = {};
    subclassesData.forEach((subclass: SubclassOption) => {
      if (subclass.class) {
        const className = subclass.class.name;
        if (!subclassesByClass[className]) {
          subclassesByClass[className] = [];
        }
        subclassesByClass[className].push(subclass.name);
      }
    });

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

    const mainClass = filledCharacter.classes[0];
    if (!filledCharacter.subClass && mainClass && subclassesByClass[mainClass]) {
      const subclassOptions = subclassesByClass[mainClass];
      filledCharacter.subClass = subclassOptions[Math.floor(Math.random() * subclassOptions.length)];
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
      model: "gpt-4o-mini",
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

/**
 * Analyzes the latest game messages to identify changes to the character's state,
 * using tools to fetch canonical data for items, spells, or conditions.
 */
export const updateCharacterStatsAPI = async () => {
  const { character, messages } = useDnDStore.getState();
  const lastTwoMessages = messages.slice(-2);

  if (lastTwoMessages.length < 2) {
    return null;
  }

  // Get tool descriptions for the AI
  const toolDescriptions = toolRegistry.generateToolDescriptions();
  const toolSchema = toolRegistry.generateToolSchemaPrompt();

  const systemPrompt = `You are a D&D game state manager. Your task is to analyze the last message from the DM and identify any changes to the player character's state.

  Character State:
  ${JSON.stringify(character, null, 2)}
  
  Last two messages (user and DM):
  ${JSON.stringify(lastTwoMessages)}
  
  AVAILABLE D&D TOOLS (${toolRegistry.getToolCount()} tools):
  ${toolDescriptions}
  
  TOOL SCHEMA FOR REFERENCE:
  ${toolSchema}
  
  TASK:
  1. Analyze the DM's last response for events that would change the character's sheet.
  2. If you see a currency change (giving, spending, or receiving gold, silver, etc.), you MUST return a stat change. Infer the amount from the context.
     - Example: If the DM says "You fish the coin out of the well", you return: { "changes": [{ "type": "stat", "stat": "money.gold", "change": 1 }] }.
     - Do NOT use tools for currency.
  3. If a player gets rid of an item (sells, drops, buries, etc.), you MUST return a stat change with an 'item_remove' type.
     - Example: If the player buries their "family heirloom", you return: { "changes": [{ "type": "item_remove", "item": "family heirloom", "category": "items" }] }.
  4. If a player re-acquires a generic item they previously had, you MUST return an 'item_add' type.
     - Example: If the player digs up their "family heirloom", you return: { "changes": [{ "type": "item_add", "item": "family heirloom", "category": "items" }] }.
  5. For events involving adding new, official D&D items, spells, conditions, etc., use the appropriate tool to get the official data.
  6. For simple stat changes (like HP loss/gain), describe the change in a structured format. Use dot notation for nested properties.
  
  Return a JSON object containing a list of changes. Each change can be a tool call result or a simple stat modification.
  
  EXAMPLES:
  - If the DM says "The goblin hits you for 5 slashing damage", you return:
    { "changes": [{ "type": "stat", "stat": "hitPoints", "change": -5 }] }

  - If the player gives 1 gold to a beggar, you return:
    { "changes": [{ "type": "stat", "stat": "money.gold", "change": -1 }] }
  
  - If the DM says "You find a Potion of Healing", you call the 'getEquipmentDetails' tool for "Potion of Healing".
  
  - If the DM says "You are now poisoned", you call the 'getConditionDetails' tool for "Poisoned".`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Analyze the last DM message and report any character state changes.`,
        },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
      tools: toolRegistry.getAllTools().map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: {
            type: "object",
            properties: tool.parameters.reduce((acc, param) => {
              acc[param.name] = {
                type: param.type,
                description: param.description,
              };
              return acc;
            }, {} as Record<string, unknown>),
            required: tool.parameters
              .filter((p) => p.required)
              .map((p) => p.name),
          },
        },
      })),
    });

    const message = response.choices[0].message;

    if (message.tool_calls) {
      // The model wants to call tools.
      const toolResults = await executeToolsFromResponse(
        JSON.stringify(message.tool_calls),
        lastTwoMessages.find((m) => m.sender === "user")?.content || ""
      );
      return { type: "tool_results", results: toolResults };
    } else if (message.content) {
      // The model returned a simple stat change.
      const parsedContent = JSON.parse(message.content);
      return { type: "stat_changes", changes: parsedContent.changes };
    }

    return null;
  } catch (error) {
    console.error("Error updating character stats:", error);
    return null;
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
      model: "gpt-4o-mini",
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

export const generateChatCompletion = async () => {
  try {
    const {
      inputMessage,
      character,
      messages,
      updateLastMessage,
      campaignOutline,
    } = useDnDStore.getState();

    // Get comprehensive tool descriptions for the AI
    const toolDescriptions = toolRegistry.generateToolDescriptions();
    const toolSchema = toolRegistry.generateToolSchemaPrompt();

    const systemMessage = {
      role: "system" as const,
      content: `You are a world-class Dungeon Master in a D&D game. The player's character has the following details:
${JSON.stringify(character, null, 2)}

Campaign Framework:
${
  campaignOutline ||
  "No campaign outline available. Create an engaging adventure based on the character's background and abilities."
}

AVAILABLE D&D TOOLS (${toolRegistry.getToolCount()} tools):
${toolDescriptions}

TOOL SCHEMA FOR REFERENCE:
${toolSchema}

IMPORTANT TOOL USAGE GUIDELINES:
- When the player asks about D&D mechanics, monsters, spells, equipment, classes, races, or any game content, use the appropriate tool to get accurate information
- You have access to comprehensive D&D 5e data including: monsters, spells, equipment, classes, races, conditions, skills, feats, backgrounds, subclasses, magic items, rules, traits, languages, and damage types
- If you need specific D&D data, mention which tool you would use and what information you need
- For natural language queries like "I wanna shoot fire at that big bird monster", use tools to get spell details (Fireball) and monster stats (Owlbear)
- For character creation questions, use class, race, background, and feat tools
- For combat questions, use monster, spell, equipment, and damage type tools
- For rules questions, use the rules tool

Respond in character as a DM, guiding the player through their adventure. Keep responses concise but engaging, and maintain the medieval fantasy atmosphere. Balance world-building, story-telling, and game mechanics.

If the player asks about their character's stats or abilities, use the provided character details to inform your response.

If they want to perform an action, describe the outcome based on their character's abilities and the situation.

Always ask the player to roll the dice for any action (e.g., initiative, attack, damage, etc.), or offer to roll for them.

Stick to the rules and mechanics of the game, always taking into consideration dice rolls and character stats and abilities.

When the player tries to detract from the story or the game, or they do something very out of character, creatively guide them back to the story.

Always give your response in markdown format.`,
    };

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        systemMessage,
        ...messages.map((msg: Message) => ({
          role:
            msg.sender === "user" ? ("user" as const) : ("assistant" as const),
          content: msg.content,
        })),
        {
          role: "user" as const,
          content: inputMessage,
        },
      ],
      temperature: 0.7,
      stream: true,
    });

    let fullContent = "";
    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullContent += content;
        updateLastMessage(fullContent);
      }
    }

    // After getting the AI response, check if we need to execute any tools
    const toolResult = await executeToolsFromResponse(
      fullContent,
      inputMessage
    );

    if (
      toolResult.toolUsed &&
      toolResult.allResults &&
      toolResult.allResults.length > 0
    ) {
      // Handle multiple tool results
      let formattedResults = "\n\n**D&D Information**:\n";
      toolResult.allResults.forEach((result) => {
        if (result.error) {
          formattedResults += `\n**${result.toolName}**: Error - ${result.error}\n`;
        } else if (result.result) {
          formattedResults += formatToolResult(result.toolName, result.result);
        }
      });
      const finalContent = fullContent + formattedResults;
      updateLastMessage(finalContent);
    } else if (
      toolResult.toolUsed &&
      toolResult.result &&
      toolResult.toolName
    ) {
      // Handle single tool result (backward compatibility)
      const formattedResult = formatToolResult(
        toolResult.toolName,
        toolResult.result
      );
      const finalContent = fullContent + formattedResult;
      updateLastMessage(finalContent);
    } else if (toolResult.toolUsed && toolResult.error) {
      // Handle tool execution error
      const errorMessage = `\n\n**Tool Error**: ${toolResult.error}`;
      const finalContent = fullContent + errorMessage;
      updateLastMessage(finalContent);
    }

    return true;
  } catch (error) {
    console.error("Error in chat route:", error);
    useDnDStore
      .getState()
      .updateLastMessage("Sorry, I encountered an error. Please try again.");
    return false;
  }
};
