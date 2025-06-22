import { OpenAI } from "openai";
import { Character, useDnDStore, Message } from "@/stores/useStore";
import {
  toolRegistry,
  executeToolsFromResponse,
  formatToolResult,
} from "./tools";
import {
  characterSpecies,
  characterSubspecies,
  characterBackgrounds,
  characterAlignments,
  characterClasses,
  characterSubclasses,
} from "../components/Character/characterValueOptions";

const client = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY!,
  dangerouslyAllowBrowser: true,
});

// Add these type definitions at the top of the file, after the imports
type StatChange = {
  field: string;
  old: number | string;
  new: number | string;
};

/**
 * Generates character details using a hybrid approach:
 * 1. Fetches canonical D&D data from the tool system for selected fields
 * 2. Uses LLM for creative fields only (backstory, personality, etc.)
 * 3. Merges both for a complete character profile
 */
export const generateCharacterDetails = async (character: Character) => {
  try {
    const filledCharacter = { ...character };

    // If a field is empty, select a random value from the predefined options.
    if (!filledCharacter.species) {
      filledCharacter.species =
        characterSpecies[Math.floor(Math.random() * characterSpecies.length)];
    }

    if (
      !filledCharacter.subspecies &&
      characterSubspecies[
        filledCharacter.species as keyof typeof characterSubspecies
      ]
    ) {
      const subspeciesOptions =
        characterSubspecies[
          filledCharacter.species as keyof typeof characterSubspecies
        ];
      filledCharacter.subspecies =
        subspeciesOptions[Math.floor(Math.random() * subspeciesOptions.length)];
    }

    if (!filledCharacter.background) {
      filledCharacter.background =
        characterBackgrounds[
          Math.floor(Math.random() * characterBackgrounds.length)
        ];
    }

    if (!filledCharacter.alignment) {
      filledCharacter.alignment =
        characterAlignments[
          Math.floor(Math.random() * characterAlignments.length)
        ];
    }

    if (!filledCharacter.classes || filledCharacter.classes.length === 0) {
      filledCharacter.classes = [
        characterClasses[Math.floor(Math.random() * characterClasses.length)],
      ];
    }

    const mainClass = filledCharacter
      .classes[0] as keyof typeof characterSubclasses;
    if (!filledCharacter.subClass && characterSubclasses[mainClass]) {
      const subclassOptions = characterSubclasses[mainClass];
      filledCharacter.subClass =
        subclassOptions[Math.floor(Math.random() * subclassOptions.length)];
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

export const updateCharacterStatsAPI = async () => {
  const currentCharacter = useDnDStore.getState().character;
  const lastThreeMessages = useDnDStore.getState().messages.slice(-3);

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system" as const,
        content:
          "You are an expert at interpreting D&D stories and character stats and traits. Based on the provided last three messages and the given character JSON object, update the character JSON object to reflect any needed changes. If no changes are needed, return the same character JSON object.",
      },
      {
        role: "user" as const,
        content: `Here are the last three messages, first from the user (character) and then from the AI (DM):
        ${JSON.stringify(lastThreeMessages)}

        Here is the character JSON object:
        ${JSON.stringify(currentCharacter)}`,
      },
    ],
    temperature: 0.9,
    response_format: { type: "json_object" },
  });

  const updatedCharacter = response.choices[0]?.message?.content
    ? JSON.parse(response.choices[0].message.content)
    : currentCharacter;

  if (JSON.stringify(updatedCharacter) !== JSON.stringify(currentCharacter)) {
    // Track changes in numeric stats and equipment
    const changes: StatChange[] = [];

    // Check numeric stats
    const numericStats = [
      "hitPoints",
      "armorClass",
      "initiative",
      "speed",
      "experience",
      "level",
    ] as const;

    numericStats.forEach((stat) => {
      if (updatedCharacter[stat] !== currentCharacter[stat]) {
        changes.push({
          field: stat,
          old: currentCharacter[stat],
          new: updatedCharacter[stat],
        });
      }
    });

    // Check attribute changes
    const attributes = [
      "strength",
      "dexterity",
      "constitution",
      "intelligence",
      "wisdom",
      "charisma",
      "honor",
      "sanity",
    ] as const;

    attributes.forEach((attr) => {
      // Check attribute value changes
      if (
        updatedCharacter.attributes[attr].value !==
        currentCharacter.attributes[attr].value
      ) {
        changes.push({
          field: `${attr} value`,
          old: currentCharacter.attributes[attr].value,
          new: updatedCharacter.attributes[attr].value,
        });
      }

      // Check attribute bonus changes
      if (
        updatedCharacter.attributes[attr].bonus !==
        currentCharacter.attributes[attr].bonus
      ) {
        changes.push({
          field: `${attr} bonus`,
          old: currentCharacter.attributes[attr].bonus,
          new: updatedCharacter.attributes[attr].bonus,
        });
      }
    });

    // Check money changes
    const currencies = [
      "platinum",
      "gold",
      "electrum",
      "silver",
      "copper",
    ] as const;
    currencies.forEach((currency) => {
      if (
        updatedCharacter.money[currency] !== currentCharacter.money[currency]
      ) {
        changes.push({
          field: `${currency} pieces`,
          old: currentCharacter.money[currency],
          new: updatedCharacter.money[currency],
        });
      }
    });

    // Check equipment changes
    const equipmentCategories = [
      "weapons",
      "armor",
      "tools",
      "magicItems",
      "items",
    ] as const;
    equipmentCategories.forEach((category) => {
      const added = updatedCharacter.equipment[category].filter(
        (item: string) => !currentCharacter.equipment[category].includes(item)
      );
      const removed = currentCharacter.equipment[category].filter(
        (item: string) => !updatedCharacter.equipment[category].includes(item)
      );

      if (added.length > 0) {
        changes.push({
          field: category,
          old: "Added",
          new: added.join(", "),
        });
      }
      if (removed.length > 0) {
        changes.push({
          field: category,
          old: "Removed",
          new: removed.join(", "),
        });
      }
    });

    // Update character and show toasts for each change
    useDnDStore.getState().setCharacter(updatedCharacter);

    // Return the changes so they can be displayed in toasts
    return changes;
  }

  return null;
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
