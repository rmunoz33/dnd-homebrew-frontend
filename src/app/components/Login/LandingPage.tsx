"use client";

import { useDnDStore } from "@/stores/useStore";
import LoginPage from "@/app/components/Login/LoginPage";
import CharacterCreationPage from "@/app/components/Character/CharacterCreationPage";
import CharacterStatsDrawer from "@/app/components/Character/CharacterStatsDrawer";
import SettingsDrawer from "@/app/components/Settings/SettingsDrawer";
import { User, Settings } from "lucide-react";
import { useState } from "react";

const LandingPage = () => {
  const {
    isLoggedIn,
    setIsLoggedIn,
    isCharacterCreated,
    setIsCharacterCreated,
  } = useDnDStore();
  const [isStatsDrawerOpen, setIsStatsDrawerOpen] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);

  if (!isLoggedIn) {
    return <LoginPage />;
  }

  if (!isCharacterCreated) {
    return <CharacterCreationPage />;
  }

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
      </div>

      <SettingsDrawer
        isOpen={isSettingsDrawerOpen}
        onClose={() => setIsSettingsDrawerOpen(false)}
      />

      <CharacterStatsDrawer
        isOpen={isStatsDrawerOpen}
        onClose={() => setIsStatsDrawerOpen(false)}
      />

      <div className="flex min-h-screen items-center justify-center flex-col">
        <div>You are logged in</div>
        <button
          className="btn"
          onClick={() => {
            setIsLoggedIn(false);
            setIsCharacterCreated(false);
          }}
        >
          Logout
        </button>
      </div>
    </>
  );
};

export default LandingPage;
