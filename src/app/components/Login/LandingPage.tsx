"use client";

import { useDnDStore } from "@/stores/useStore";
import LoginPage from "@/app/components/Login/LoginPage";
import CharacterCreationPage from "@/app/components/Character/CharacterCreationPage";
import GamePage from "@/app/components/Game/GamePage";

const LandingPage = () => {
  const { isLoggedIn, isCharacterCreated } = useDnDStore();

  if (!isLoggedIn) {
    return <LoginPage />;
  }

  if (!isCharacterCreated) {
    return <CharacterCreationPage />;
  }

  return <GamePage />;
};

export default LandingPage;
