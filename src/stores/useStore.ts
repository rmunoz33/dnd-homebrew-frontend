import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface DnDStore {
  isLoggedIn: boolean;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
}

export const useDnDStore = create<DnDStore>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      setIsLoggedIn: (isLoggedIn: boolean) => set({ isLoggedIn }),
    }),
    {
      name: "dnd-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
