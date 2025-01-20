"use client";

import { useDnDStore } from "@/stores/useStore";
import LoginPage from "@/app/components/Login/LoginPage";
import CharacterCreationPage from "@/app/components/Character/CharacterCreationPage";
import CharacterStatsDrawer from "@/app/components/Character/CharacterStatsDrawer";
import { User } from "lucide-react";
import { useState } from "react";

const LandingPage = () => {
  const {
    isLoggedIn,
    setIsLoggedIn,
    isCharacterCreated,
    setIsCharacterCreated,
  } = useDnDStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  if (!isLoggedIn) {
    return <LoginPage />;
  }

  if (!isCharacterCreated) {
    return <CharacterCreationPage />;
  }

  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <button
          className="btn btn-circle btn-ghost bg-base-200"
          onClick={() => setIsDrawerOpen(true)}
        >
          <User size={24} />
        </button>
      </div>

      <CharacterStatsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
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
