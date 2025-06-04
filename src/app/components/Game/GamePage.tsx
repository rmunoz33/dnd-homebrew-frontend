import { useState } from "react";
import CharacterStatsDrawer from "@/app/components/Character/CharacterStatsDrawer";
import SettingsDrawer from "@/app/components/Settings/SettingsDrawer";
import { User, Settings, Dices } from "lucide-react";
import GameChat from "@/app/components/Game/GameChat";
import DiceDrawer from "@/app/components/Game/DiceDrawer";

const GamePage = () => {
  const [isStatsDrawerOpen, setIsStatsDrawerOpen] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [isDiceDrawerOpen, setIsDiceDrawerOpen] = useState(false);

  return (
    <>
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        <button
          className="btn btn-circle btn-ghost bg-base-200"
          onClick={() => setIsSettingsDrawerOpen(true)}
        >
          <Settings size={24} />
        </button>
        <button
          className="btn btn-circle btn-ghost bg-base-200"
          onClick={() => setIsStatsDrawerOpen(true)}
        >
          <User size={24} />
        </button>
        <button
          className="btn btn-circle btn-ghost bg-base-200"
          onClick={() => setIsDiceDrawerOpen(true)}
        >
          <Dices size={24} />
        </button>
      </div>

      <SettingsDrawer
        isOpen={isSettingsDrawerOpen}
        onClose={() => setIsSettingsDrawerOpen(false)}
      />

      <CharacterStatsDrawer
        isOpen={isStatsDrawerOpen}
        onClose={() => setIsStatsDrawerOpen(false)}
      />

      <DiceDrawer
        isOpen={isDiceDrawerOpen}
        onClose={() => setIsDiceDrawerOpen(false)}
      />

      <GameChat />
    </>
  );
};

export default GamePage;
