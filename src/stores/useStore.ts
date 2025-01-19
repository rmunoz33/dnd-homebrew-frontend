import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface DnDStore {
  isLoggedIn: boolean;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  isCharacterCreated: boolean;
  setIsCharacterCreated: (isCharacterCreated: boolean) => void;
  character: Character;
  setCharacter: (character: Character) => void;
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
    weapons: [],
    armor: [],
    tools: [],
    magicItems: [],
    items: [],
  },
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
    }),
    {
      name: "dnd-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
