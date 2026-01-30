import { Tool, toolRegistry } from "./registry";
import { useDnDStore, Character } from "@/stores/useStore";
import { toast } from "sonner";

/**
 * Character State Update Tools
 *
 * These tools allow the AI DM to directly modify character state during gameplay.
 * They are called during response generation (not post-hoc) for immediate feedback.
 */

// Valid equipment categories (matches Character["equipment"] keys)
const EQUIPMENT_CATEGORIES = ["weapons", "armor", "tools", "magicItems", "items"] as const;
type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number];

// Valid currency types (matches Character["money"] keys)
const CURRENCY_TYPES = ["platinum", "gold", "electrum", "silver", "copper"] as const;
type CurrencyType = (typeof CURRENCY_TYPES)[number];

/**
 * Tool: update_hit_points
 *
 * Modifies the character's current HP. Use for damage, healing, or temporary HP effects.
 * HP is automatically capped at maxHitPoints and floored at 0.
 */
const updateHitPoints: Tool = {
  name: "update_hit_points",
  description:
    "Call whenever the player takes damage or receives healing. Use negative for damage, positive for healing. HP auto-caps at max and floors at 0.",
  parameters: [
    {
      name: "amount",
      type: "number",
      description:
        "The amount to add to current HP. Use negative for damage (e.g., -5 for 5 damage), positive for healing (e.g., +10 for 10 HP healed).",
      required: true,
    },
    {
      name: "reason",
      type: "string",
      description:
        "Brief description of why HP changed (e.g., 'goblin attack', 'potion of healing', 'fire trap'). Used for logging.",
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>) => {
    const amount = Number(params.amount);
    const reason = String(params.reason || "");

    if (isNaN(amount)) {
      return { success: false, error: `Invalid amount "${params.amount}". Must be a number.` };
    }

    const { character, applyCharacterChanges } = useDnDStore.getState();
    const previousHP = character.hitPoints;

    applyCharacterChanges({
      type: "stat_changes",
      changes: [{ type: "stat", stat: "hitPoints", change: amount }],
    });

    const newCharacter = useDnDStore.getState().character;
    const newHP = newCharacter.hitPoints;
    const actualChange = newHP - previousHP;

    // Show toast notification
    if (actualChange < 0) {
      toast(`💔 ${Math.abs(actualChange)} damage`, {
        description: `${reason} • HP: ${newHP}/${newCharacter.maxHitPoints}`,
        className: "bg-red-900/90 border-red-700 text-red-100",
      });
    } else if (actualChange > 0) {
      toast(`💚 Healed ${actualChange} HP`, {
        description: `${reason} • HP: ${newHP}/${newCharacter.maxHitPoints}`,
        className: "bg-emerald-900/90 border-emerald-700 text-emerald-100",
      });
    }

    return {
      success: true,
      previousHP,
      newHP,
      maxHP: newCharacter.maxHitPoints,
      actualChange,
      reason,
    };
  },
};

/**
 * Tool: update_currency
 *
 * Modifies the character's money. Use for purchases, loot, rewards, or theft.
 */
const updateCurrency: Tool = {
  name: "update_currency",
  description:
    "Call for ANY currency change, no matter how small — even a single coin tossed, given as a tip, or spent on a bribe. Every transaction must be tracked. Use negative for spending/losing, positive for gaining.",
  parameters: [
    {
      name: "currency_type",
      type: "string",
      description:
        "The type of currency to modify. Must be one of: platinum, gold, electrum, silver, copper.",
      required: true,
    },
    {
      name: "amount",
      type: "number",
      description:
        "The amount to add. Use negative for spending/losing (e.g., -10), positive for gaining (e.g., +50).",
      required: true,
    },
    {
      name: "reason",
      type: "string",
      description:
        "Brief description of the transaction (e.g., 'bought rations', 'quest reward', 'pickpocketed').",
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>) => {
    const currencyType = String(params.currency_type || "");
    const amount = Number(params.amount);
    const reason = String(params.reason || "");

    if (isNaN(amount)) {
      return { success: false, error: `Invalid amount "${params.amount}". Must be a number.` };
    }

    // Validate currency type
    if (!CURRENCY_TYPES.includes(currencyType as CurrencyType)) {
      return {
        success: false,
        error: `Invalid currency type "${currencyType}". Must be one of: ${CURRENCY_TYPES.join(", ")}`,
      };
    }

    const { character, applyCharacterChanges } = useDnDStore.getState();
    const previousAmount = character.money[currencyType as CurrencyType];

    applyCharacterChanges({
      type: "stat_changes",
      changes: [{ type: "stat", stat: `money.${currencyType}`, change: amount }],
    });

    const newCharacter = useDnDStore.getState().character;
    const newAmount = newCharacter.money[currencyType as CurrencyType];

    // Show toast notification
    const currencyLabel = currencyType.charAt(0).toUpperCase() + currencyType.slice(1);
    const coinEmoji = currencyType === "gold" ? "🪙" : currencyType === "platinum" ? "💎" : "🪙";
    if (amount < 0) {
      toast(`${coinEmoji} -${Math.abs(amount)} ${currencyLabel}`, {
        description: reason,
        className: "bg-amber-900/90 border-amber-700 text-amber-100",
      });
    } else {
      toast(`${coinEmoji} +${amount} ${currencyLabel}`, {
        description: reason,
        className: "bg-yellow-900/90 border-yellow-600 text-yellow-100",
      });
    }

    return {
      success: true,
      currencyType,
      previousAmount,
      newAmount,
      change: amount,
      reason,
    };
  },
};

/**
 * Tool: add_inventory_item
 *
 * Adds an item to the character's inventory in the appropriate category.
 */
const addInventoryItem: Tool = {
  name: "add_inventory_item",
  description:
    "Call whenever the player acquires an item — loot, purchases, gifts, or found objects. Choose the appropriate category: weapons, armor, tools, magicItems, or items.",
  parameters: [
    {
      name: "item_name",
      type: "string",
      description:
        "The name of the item to add (e.g., 'Longsword', 'Potion of Healing', 'Rope (50 feet)').",
      required: true,
    },
    {
      name: "category",
      type: "string",
      description:
        "The inventory category for this item. Must be one of: weapons (swords, bows, daggers), armor (shields, plate, leather), tools (thieves' tools, musical instruments), magicItems (enchanted items, wands, rings), items (general adventuring gear, potions, consumables).",
      required: true,
    },
    {
      name: "reason",
      type: "string",
      description:
        "Brief description of how the item was acquired (e.g., 'looted from goblin', 'purchased from merchant', 'reward from quest').",
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>) => {
    const itemName = String(params.item_name || "");
    const category = String(params.category || "");
    const reason = String(params.reason || "");

    if (!itemName) {
      return { success: false, error: "item_name is required." };
    }

    // Validate category
    if (!EQUIPMENT_CATEGORIES.includes(category as EquipmentCategory)) {
      return {
        success: false,
        error: `Invalid category "${category}". Must be one of: ${EQUIPMENT_CATEGORIES.join(", ")}`,
      };
    }

    const { applyCharacterChanges } = useDnDStore.getState();

    applyCharacterChanges({
      type: "stat_changes",
      changes: [
        {
          type: "item_add",
          item: itemName,
          category: category as keyof Character["equipment"],
        },
      ],
    });

    // Show toast notification with category-specific icon
    const categoryIcons: Record<string, string> = {
      weapons: "⚔️",
      armor: "🛡️",
      tools: "🔧",
      magicItems: "✨",
      items: "📦",
    };
    toast(`${categoryIcons[category] || "📦"} ${itemName}`, {
      description: reason,
      className: "bg-blue-900/90 border-blue-700 text-blue-100",
    });

    return {
      success: true,
      itemName,
      category,
      reason,
    };
  },
};

/**
 * Tool: remove_inventory_item
 *
 * Removes an item from the character's inventory.
 */
const removeInventoryItem: Tool = {
  name: "remove_inventory_item",
  description:
    "Call whenever the player loses, sells, drops, consumes, or gives away an item. Item matching is case-insensitive.",
  parameters: [
    {
      name: "item_name",
      type: "string",
      description:
        "The name of the item to remove. Must match an item in the character's inventory (case-insensitive).",
      required: true,
    },
    {
      name: "category",
      type: "string",
      description:
        "The inventory category to remove from. Must be one of: weapons, armor, tools, magicItems, items.",
      required: true,
    },
    {
      name: "reason",
      type: "string",
      description:
        "Brief description of why the item was removed (e.g., 'sold to merchant', 'consumed', 'given to NPC', 'destroyed').",
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>) => {
    const itemName = String(params.item_name || "");
    const category = String(params.category || "");
    const reason = String(params.reason || "");

    if (!itemName) {
      return { success: false, error: "item_name is required." };
    }

    // Validate category
    if (!EQUIPMENT_CATEGORIES.includes(category as EquipmentCategory)) {
      return {
        success: false,
        error: `Invalid category "${category}". Must be one of: ${EQUIPMENT_CATEGORIES.join(", ")}`,
      };
    }

    const { character, applyCharacterChanges } = useDnDStore.getState();

    // Check if item exists in inventory
    const categoryItems = character.equipment[category as keyof Character["equipment"]];
    const itemExists = categoryItems.some(
      (item) => item.toLowerCase() === itemName.toLowerCase()
    );

    if (!itemExists) {
      return {
        success: false,
        error: `Item "${itemName}" not found in ${category}. Available items: ${categoryItems.join(", ") || "none"}`,
      };
    }

    applyCharacterChanges({
      type: "stat_changes",
      changes: [
        {
          type: "item_remove",
          item: itemName,
          category: category as keyof Character["equipment"],
        },
      ],
    });

    // Show toast notification
    toast(`📤 Lost: ${itemName}`, {
      description: reason,
      className: "bg-slate-800/90 border-slate-600 text-slate-200",
    });

    return {
      success: true,
      itemName,
      category,
      reason,
    };
  },
};

/**
 * Tool: update_experience
 *
 * Awards or removes experience points. Useful for quest completion, monster defeats, or story milestones.
 */
const updateExperience: Tool = {
  name: "update_experience",
  description:
    "Call to award XP for defeating enemies, completing quests, or story milestones. Use positive values; negative only for rare curse effects.",
  parameters: [
    {
      name: "amount",
      type: "number",
      description:
        "The amount of XP to add. Use positive for gaining XP, negative for losing XP (rare).",
      required: true,
    },
    {
      name: "reason",
      type: "string",
      description:
        "Brief description of why XP was awarded (e.g., 'defeated goblin warband', 'completed rescue quest', 'clever roleplaying').",
      required: true,
    },
  ],
  execute: async (params: Record<string, unknown>) => {
    const amount = Number(params.amount);
    const reason = String(params.reason || "");

    if (isNaN(amount)) {
      return { success: false, error: `Invalid amount "${params.amount}". Must be a number.` };
    }

    const { character, applyCharacterChanges } = useDnDStore.getState();
    const previousXP = character.experience;

    applyCharacterChanges({
      type: "stat_changes",
      changes: [{ type: "stat", stat: "experience", change: amount }],
    });

    const newCharacter = useDnDStore.getState().character;
    const newXP = newCharacter.experience;

    // Show toast notification
    if (amount >= 0) {
      toast(`⭐ +${amount} XP`, {
        description: reason,
        className: "bg-purple-900/90 border-purple-700 text-purple-100",
      });
    } else {
      toast(`⭐ ${amount} XP`, {
        description: reason,
        className: "bg-purple-950/90 border-purple-800 text-purple-200",
      });
    }

    return {
      success: true,
      previousXP,
      newXP,
      change: amount,
      reason,
    };
  },
};

// Register all character tools
toolRegistry.register(updateHitPoints);
toolRegistry.register(updateCurrency);
toolRegistry.register(addInventoryItem);
toolRegistry.register(removeInventoryItem);
toolRegistry.register(updateExperience);

export {
  updateHitPoints,
  updateCurrency,
  addInventoryItem,
  removeInventoryItem,
  updateExperience,
};
