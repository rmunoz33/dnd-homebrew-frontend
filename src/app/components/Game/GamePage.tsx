import { useState, useEffect } from "react";
import CharacterStatsDrawer from "@/app/components/Character/CharacterStatsDrawer";
import SettingsDrawer from "@/app/components/Settings/SettingsDrawer";
import { User, Settings, ArrowDown } from "lucide-react";
import GameChat from "@/app/components/Game/GameChat";

const GamePage = () => {
  const [isStatsDrawerOpen, setIsStatsDrawerOpen] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const scrollToBottom = () => {
    // Dispatch custom event for virtualized list
    window.dispatchEvent(new CustomEvent('scrollToBottom'));
  };

  useEffect(() => {
    const handleScroll = () => {
      const chatContainer = document.querySelector(
        '[data-messages-container="true"]'
      );
      if (!chatContainer) return;

      // Show button when scrolled up at least 300px from bottom
      const isScrolledUp =
        chatContainer.scrollHeight -
          chatContainer.clientHeight -
          chatContainer.scrollTop >
        300;
      setShowScrollBottom(isScrolledUp);
    };

    const chatContainer = document.querySelector(
      '[data-messages-container="true"]'
    );
    if (chatContainer) {
      chatContainer.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (chatContainer) {
        chatContainer.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

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

      {showScrollBottom && (
        <div className="fixed bottom-20 right-4 z-50">
          <button
            onClick={scrollToBottom}
            className="btn btn-circle bg-gray-700 hover:bg-gray-600 text-white shadow-lg"
            aria-label="Scroll to bottom"
          >
            <ArrowDown size={20} />
          </button>
        </div>
      )}

      <SettingsDrawer
        isOpen={isSettingsDrawerOpen}
        onClose={() => setIsSettingsDrawerOpen(false)}
      />

      <CharacterStatsDrawer
        isOpen={isStatsDrawerOpen}
        onClose={() => setIsStatsDrawerOpen(false)}
      />

      <GameChat />
    </>
  );
};

export default GamePage;
