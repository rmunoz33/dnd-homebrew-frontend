import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
}

interface DnDStore {
  isLoggedIn: boolean;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  isCharacterCreated: boolean;
  setIsCharacterCreated: (isCharacterCreated: boolean) => void;
  character: Character;
  setCharacter: (character: Character) => void;
  initialCharacter: Character;
  messages: Message[];
  addMessage: (message: Message) => void;
  updateLastMessage: (content: string) => void;
  clearMessages: () => void;
  inputMessage: string;
  setInputMessage: (message: string) => void;
  campaignOutline: string;
  setCampaignOutline: (outline: string) => void;
  filters: {
    species: string;
    subspecies: string;
    alignment: string;
    background: string;
    class: string;
    subclass: string;
    weapon: string;
    armor: string;
    tool: string;
    magicItem: string;
    item: string;
    specialAbility: string;
  };
  setFilter: (key: keyof DnDStore["filters"], value: string) => void;
  resetFilters: () => void;
}

export interface Character {
  name: string;
  level: number;
  species: string;
  subspecies: string;
  classes: string[];
  subClass: string;
  specialAbilities: string[];
  background: string;
  backStory: string;
  alignment: string;
  experience: number;
  hitPoints: number;
  armorClass: number;
  initiative: number;
  speed: number;
  attributes: {
    strength: { value: number; bonus: number };
    dexterity: { value: number; bonus: number };
    constitution: { value: number; bonus: number };
    intelligence: { value: number; bonus: number };
    wisdom: { value: number; bonus: number };
    charisma: { value: number; bonus: number };
    honor: { value: number; bonus: number };
    sanity: { value: number; bonus: number };
  };
  money: {
    platinum: number;
    gold: number;
    electrum: number;
    silver: number;
    copper: number;
  };
  equipment: {
    weapons: string[];
    armor: string[];
    tools: string[];
    magicItems: string[];
    items: string[];
  };
}

export const initialCharacter: Character = {
  name: "",
  level: 1,
  species: "",
  subspecies: "",
  classes: [],
  subClass: "",
  specialAbilities: [],
  background: "",
  backStory: "",
  alignment: "",
  experience: 1,
  hitPoints: 1,
  armorClass: 1,
  initiative: 1,
  speed: 1,
  attributes: {
    strength: { value: 1, bonus: -5 },
    dexterity: { value: 1, bonus: -5 },
    constitution: { value: 1, bonus: -5 },
    intelligence: { value: 1, bonus: -5 },
    wisdom: { value: 1, bonus: -5 },
    charisma: { value: 1, bonus: -5 },
    honor: { value: 1, bonus: -5 },
    sanity: { value: 1, bonus: -5 },
  },
  money: {
    platinum: 0,
    gold: 0,
    electrum: 0,
    silver: 0,
    copper: 0,
  },
  equipment: {
    weapons: ["Unarmed Strike"],
    armor: [],
    tools: [],
    magicItems: [],
    items: [],
  },
};

export const initialFilters = {
  species: "",
  subspecies: "",
  alignment: "",
  background: "",
  class: "",
  subclass: "",
  weapon: "",
  armor: "",
  tool: "",
  magicItem: "",
  item: "",
  specialAbility: "",
};

type PersistedMessage = Omit<Message, "timestamp"> & { timestamp: string };
type PersistedState = Omit<DnDStore, "messages"> & {
  messages: PersistedMessage[];
};

export const useDnDStore = create<DnDStore>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      setIsLoggedIn: (isLoggedIn: boolean) => set({ isLoggedIn }),
      isCharacterCreated: false,
      setIsCharacterCreated: (isCharacterCreated: boolean) =>
        set({ isCharacterCreated }),
      character: initialCharacter,
      setCharacter: (character: Character) => set({ character }),
      initialCharacter,
      messages: [],
      addMessage: (message: Message) =>
        set((state) => ({ messages: [...state.messages, message] })),
      updateLastMessage: (content: string) =>
        set((state) => {
          const messages = [...state.messages];
          const lastMessage = messages[messages.length - 1];
          if (lastMessage && lastMessage.sender === "ai") {
            lastMessage.content = content;
          }
          return { messages };
        }),
      clearMessages: () => set({ messages: [] }),
      inputMessage: "",
      setInputMessage: (message: string) => set({ inputMessage: message }),
      campaignOutline: "",
      setCampaignOutline: (outline: string) =>
        set({ campaignOutline: outline }),
      filters: initialFilters,
      setFilter: (key: keyof DnDStore["filters"], value: string) =>
        set((state) => ({
          filters: { ...state.filters, [key]: value },
        })),
      resetFilters: () => set({ filters: initialFilters }),
    }),
    {
      name: "dnd-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        ...state,
        messages: state.messages.map((msg) => ({
          ...msg,
          timestamp: msg.timestamp.toISOString(),
        })),
      }),
      merge: (persistedState: unknown, currentState: DnDStore) => {
        const typedPersistedState = persistedState as PersistedState;
        return {
          ...currentState,
          ...typedPersistedState,
          messages: (typedPersistedState.messages || []).map((msg) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        };
      },
    }
  )
);
