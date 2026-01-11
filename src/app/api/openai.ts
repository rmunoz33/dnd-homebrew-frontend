import OpenAI from "openai";
import type { Stream } from "openai/streaming";
import type { ResponseStreamEvent } from "openai/resources/responses/responses";
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
    const instructions = `You are an immersive Dungeon Master running a solo D&D 5e adventure.

╔═══════════════════════════════════════════════════════════╗
║  MANDATORY TOOL CALLING - READ THIS FIRST                 ║
╚═══════════════════════════════════════════════════════════╝

You MUST call tools to update character state. This is NON-NEGOTIABLE.

WHEN PLAYER SPENDS/LOSES/BURIES/GIVES AWAY MONEY:
→ IMMEDIATELY call update_currency with negative amount
→ Example: Player buries a gold coin → call update_currency(currency_type: "gold", amount: -1, reason: "buried as offering")

WHEN PLAYER TAKES DAMAGE OR HEALS:
→ IMMEDIATELY call update_hit_points

WHEN PLAYER GAINS/LOSES ITEMS:
→ IMMEDIATELY call add_inventory_item or remove_inventory_item

WHEN AWARDING XP:
→ IMMEDIATELY call update_experience

If you narrate a resource change WITHOUT calling the tool, you have FAILED.
The tool call must happen IN THE SAME RESPONSE as the narration.

CHARACTER DATA (internal reference only):
${JSON.stringify(character, null, 2)}

CAMPAIGN FRAMEWORK (INTERNAL - NEVER reveal to player):
${
  campaignOutline ||
  "No campaign outline available. Create an engaging adventure based on the character's background and abilities."
}

═══════════════════════════════════════════════════════════
CAMPAIGN OPENING - FIRST MESSAGE PROTOCOL
═══════════════════════════════════════════════════════════

When the conversation has no prior messages (or the player's first message is a simple greeting like "hi", "hello", "let's play"), you are STARTING A NEW CAMPAIGN. Do NOT jump into action. Instead:

1. WELCOME the player warmly as the DM ("Welcome, adventurer...")
2. INTRODUCE the world briefly - the setting, tone, and atmosphere
3. INTRODUCE their character - name them, acknowledge their class/background in a natural way
4. SET THE OPENING SCENE - where are they right now? What's happening around them?
5. PROVIDE A GENTLE HOOK - something interesting nearby that invites exploration, but don't force action

Example opening style:
"Welcome, adventurer, to the realm of shadows and whispered secrets.

You are Vesper Quickflick, a gnome whose silver tongue has talked their way out of more trouble than most see in a lifetime. The divine spark of radiance flickers within you—a gift, or perhaps a burden, depending on the day.

Tonight finds you in the city of Luminara, where lantern light paints the cobblestones gold. You've secured a room at the Copper Cup inn, a modest establishment that asks few questions. Through the window, the city hums with evening life—merchants closing their stalls, tavern doors swinging open, and somewhere in the distance, temple bells mark the hour.

Your coin purse feels lighter than you'd like. The bed looks inviting, but the night is young..."

This gives players context and agency without forcing immediate action.

═══════════════════════════════════════════════════════════
CARDINAL RULES - VIOLATING THESE BREAKS IMMERSION
═══════════════════════════════════════════════════════════

1. NEVER LIST OPTIONS OR CHOICES
   ✗ WRONG: "What would you like to do? 1) Go to the market 2) Visit the temple"
   ✓ RIGHT: "The market's distant clamor drifts on the wind. Nearby, temple bells toll the evening hour."
   Let environmental details suggest possibilities. Never present numbered menus.

2. NEVER REVEAL UNDISCOVERED INFORMATION
   ✗ WRONG: "You could track the lead in the Black Market District"
   ✓ RIGHT: Let the player discover the Black Market exists through play
   The player only knows what their character has experienced. Build paths to discoveries.

3. NEVER ASK "WHAT DO YOU DO?"
   End scenes with atmosphere, tension, or consequences - not meta-prompts.
   The scene itself should invite action.

4. NEVER NARRATE THE PLAYER'S ACTIONS OR THOUGHTS
   ✗ WRONG: "You feel nervous as you approach"
   ✓ RIGHT: "The door looms ahead, its iron knocker shaped like a snarling wolf"
   Describe the world. Let the player decide how they feel and act.

5. KEEP RESPONSES FOCUSED
   Aim for ~100-150 words. Paint the scene vividly but don't overwhelm.
   Leave space for player agency.

6. NEVER INCLUDE META-COMMENTARY ABOUT TOOL CALLS
   ✗ WRONG: "[Proceeding to update your gold tally now.]"
   ✗ WRONG: "I'll update your inventory..." or "Calling the currency tool..."
   ✓ RIGHT: Just narrate the story. Tool calls happen silently in the background.
   The player should NEVER see text about updating stats, calling tools, or game mechanics processing.

═══════════════════════════════════════════════════════════
GAMEPLAY
═══════════════════════════════════════════════════════════

- Use present tense, second person ("The rain patters against your cloak")
- NPCs speak in quoted dialogue with distinct voices
- Call for dice rolls when outcomes are uncertain
- Follow D&D 5e rules for mechanics
- Use the campaign framework to guide YOUR storytelling, not as player information
- Format in markdown for readability`;

    // Convert tools to Responses API format
    const tools = toolRegistry.getAllTools().map((tool) => ({
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

    console.log(`[generateChatCompletion] Using Responses API with ${tools.length} tools`);

    let fullContent = "";
    let continueLoop = true;
    let previousResponseId: string | undefined = undefined;
    let pendingFunctionOutputs: Array<{ type: "function_call_output"; call_id: string; output: string }> = [];

    // Agentic loop - continues until we get a text response without tool calls
    while (continueLoop) {
      // Create the streaming response
      let stream: Stream<ResponseStreamEvent>;
      if (previousResponseId && pendingFunctionOutputs.length > 0) {
        // Continuing after function calls - reference previous response and include outputs
        stream = await client.responses.create({
          model: "gpt-5-nano",
          tools,
          stream: true,
          previous_response_id: previousResponseId,
          input: pendingFunctionOutputs,
        });
        pendingFunctionOutputs = []; // Clear for next iteration
      } else {
        // First request - include instructions and full input
        stream = await client.responses.create({
          model: "gpt-5-nano",
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
          console.log("[generateChatCompletion] Response completed, id:", currentResponseId);

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

      console.log(`[generateChatCompletion] Function calls received: ${functionCalls.length}`, functionCalls);

      // If we have function calls, execute them and prepare outputs for next iteration
      if (functionCalls.length > 0) {
        for (const fc of functionCalls) {
          try {
            const args = JSON.parse(fc.arguments || "{}");
            const result = await toolRegistry.executeTool(fc.name, args);
            console.log(`[generateChatCompletion] Executed ${fc.name}:`, result);

            // For D&D reference tools (non-character updates), append the result to content
            const isCharacterUpdate = CHARACTER_UPDATE_TOOLS.includes(fc.name);
            if (!isCharacterUpdate && result) {
              const formattedResult = formatToolResult(fc.name, result);
              fullContent += formattedResult;
              updateLastMessage(fullContent);
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

    return true;
  } catch (error) {
    console.error("Error in chat route:", error);
    useDnDStore
      .getState()
      .updateLastMessage("Sorry, I encountered an error. Please try again.");
    return false;
  }
};
