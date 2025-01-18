"use client";

import { useDnDStore } from "@/stores/useStore";
import LoginPage from "@/app/components/Login/LoginPage";

const LandingPage = () => {
  const { isLoggedIn, setIsLoggedIn } = useDnDStore();

  if (!isLoggedIn) {
    return <LoginPage />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center flex-col">
      <div>You are logged in</div>
      <button className="btn" onClick={() => setIsLoggedIn(false)}>
        Logout
      </button>
    </div>
  );
};

export default LandingPage;
