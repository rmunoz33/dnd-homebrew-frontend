import { OpenAI } from "openai";
import {
  Character,
  initialCharacter,
  useDnDStore,
  Message,
} from "@/stores/useStore";
import {
  characterSpecies,
  characterSubspecies,
  characterBackgrounds,
  characterAlignments,
  characterClasses,
} from "@/app/components/Character/characterValueOptions";

const client = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY!,
  dangerouslyAllowBrowser: true,
});

const isDefaultValue = (
  value: Character[keyof Character],
  field: keyof Character
) => {
  if (field === "attributes") {
    const attributes = value as Character["attributes"];
    const defaultAttributes = initialCharacter.attributes;

    // Check if all attributes have default values
    return Object.entries(attributes).every(([attrName, attrObj]) => {
      const typedAttrName = attrName as keyof typeof attributes;
      return (
        attrObj.value === defaultAttributes[typedAttrName].value &&
        attrObj.bonus === defaultAttributes[typedAttrName].bonus
      );
    });
  }

  if (field === "classes" && Array.isArray(value)) {
    return value.length === 0;
  }
  return value === initialCharacter[field];
};

// Add these type definitions at the top of the file, after the imports
type StatChange = {
  field: string;
  old: number | string;
  new: number | string;
};

export const generateCharacterDetails = async (character: Character) => {
  const nonDefaultFields = Object.entries(character)
    .filter(([key, value]) => !isDefaultValue(value, key as keyof Character))
    .reduce<Partial<Character>>((acc, [key, value]) => {
      acc[key as keyof Character] = value;
      return acc;
    }, {});

  const prompt = `As a D&D character creation expert, help complete a character profile based on these known details.

  The options for species are: ${JSON.stringify(characterSpecies)}
  The options for subspecies are: ${JSON.stringify(characterSubspecies)}
  The options for backgrounds are: ${JSON.stringify(characterBackgrounds)}
  The options for alignments are: ${JSON.stringify(characterAlignments)}
  The options for classes are: ${JSON.stringify(characterClasses)}

  Here is the default character profile:
  ${JSON.stringify(initialCharacter)}

  Here is the known character profile:
  ${JSON.stringify(nonDefaultFields)}

  Suggest appropriate values for any missing character attributes in JSON format, maintaining the given structure.
  If no backstory is provided, provide one in the form of a short paragraph.
  Focus on creating a cohesive character that makes sense with the provided information.
  Calculate attribute bonuses with this formula: (attribute value - 10) / 2. Round down to the nearest integer.`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a D&D character creation expert who provides detailed, lore-appropriate suggestions for character attributes.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.9,
      response_format: { type: "json_object" },
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error generating character details:", error);
    throw error;
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

export const generateChatCompletion = async () => {
  try {
    const { inputMessage, character, messages, updateLastMessage } =
      useDnDStore.getState();

    const systemMessage = {
      role: "system" as const,
      content: `You are a world-class Dungeon Master in a D&D game. The player's character has the following details:
${JSON.stringify(character, null, 2)}

Respond in character as a DM, guiding the player through their adventure. Keep responses concise but engaging, and maintain the medieval fantasy atmosphere. Balance world-building, story-telling, and combat and game mechanics.

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

    return true;
  } catch (error) {
    console.error("Error in chat route:", error);
    useDnDStore
      .getState()
      .updateLastMessage("Sorry, I encountered an error. Please try again.");
    return false;
  }
};
