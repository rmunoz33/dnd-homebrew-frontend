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
  background: string;
  backStory: string;
  alignment: string;
  experience: number;
  hitPoints: number;
  armorClass: number;
  initiative: number;
  speed: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  honor: number;
  sanity: number;
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
  background: "",
  backStory: "",
  alignment: "",
  experience: 1,
  hitPoints: 1,
  armorClass: 1,
  initiative: 1,
  speed: 1,
  strength: 1,
  dexterity: 1,
  constitution: 1,
  intelligence: 1,
  wisdom: 1,
  charisma: 1,
  honor: 1,
  sanity: 1,
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
      merge: (persistedState: any, currentState: DnDStore) => ({
        ...currentState,
        ...persistedState,
        messages: (persistedState.messages || []).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      }),
    }
  )
);
