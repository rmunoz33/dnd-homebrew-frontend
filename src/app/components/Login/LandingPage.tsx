"use client";

import { useDnDStore } from "@/stores/useStore";
import LoginPage from "@/app/components/Login/LoginPage";
import CharacterCreationPage from "@/app/components/Character/CharacterCreationPage";

const LandingPage = () => {
  const {
    isLoggedIn,
    setIsLoggedIn,
    isCharacterCreated,
    setIsCharacterCreated,
  } = useDnDStore();

  if (!isLoggedIn) {
    return <LoginPage />;
  }

  if (!isCharacterCreated) {
    return <CharacterCreationPage />;
  }

  return (
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
  );
};

export default LandingPage;
