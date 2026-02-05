import { Character } from "@/stores/useStore";
import { toolRegistry } from "./tools";
import {
  generateCreativeFields,
  generateCampaignOutline as serverGenerateCampaignOutline,
} from "@/app/actions/openai";
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
 * 2. Uses LLM (via server action) for creative fields only (backstory, personality, etc.)
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

    // 3. Use server action for creative fields (keeps API key server-side)
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
      // Bonuses are guaranteed set by the calculation loop above
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
 * Generates a campaign outline for a character.
 * Uses server action to keep the API key secure.
 */
export const generateCampaignOutline = async (character: Character) => {
  // Get comprehensive tool descriptions for campaign creation
  const toolDescriptions = toolRegistry.generateToolDescriptions();
  const toolSchema = toolRegistry.generateToolSchemaPrompt();
  const toolCount = toolRegistry.getToolCount();

  return serverGenerateCampaignOutline(character, toolDescriptions, toolSchema, toolCount);
};
