import { OpenAI } from "openai";
import { Character, initialCharacter, useDnDStore } from "@/stores/useStore";
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

const isDefaultValue = (value: any, field: keyof Character) => {
  return JSON.stringify(value) === JSON.stringify(initialCharacter[field]);
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

  Suggest appropriate values for any missing character attributes in JSON format, maintaining the given structure. If no backstory is provided, provide one in the form of a short paragraph. Focus on creating a cohesive character that makes sense with the provided information.`;

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
  // This function updates the character's stats based on the last two messages in the chat. It sends a request to the OpenAI API
  // with the last two messages and the current character JSON object. The API then returns an updated character JSON object
  // based on the context provided. If the returned character object is different from the current one, it updates the character
  // state in the store.
  const lastTwoMessages = useDnDStore.getState().messages.slice(-2);

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are an expert at intpreting D&D stories and character stats and traits. Based on the provided last two messages and the given character JSON object, update the character JSON object to reflect any needed changes. If no changes are needed, return the same character JSON object.",
      },
      {
        role: "user",
        content: `Here are the last two messages:
        ${JSON.stringify(lastTwoMessages)}

        Here is the character JSON object:
        ${JSON.stringify(useDnDStore.getState().character)}`,
      },
    ],
    temperature: 0.9,
    response_format: { type: "json_object" },
  });

  const updatedCharacter = response.choices[0]?.message?.content
    ? JSON.parse(response.choices[0].message.content)
    : useDnDStore.getState().character;

  if (
    JSON.stringify(updatedCharacter) !==
    JSON.stringify(useDnDStore.getState().character)
  ) {
    useDnDStore.getState().setCharacter(updatedCharacter);
  }
};
