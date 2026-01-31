"use client";

import { useDnDStore } from "@/stores/useStore";
import { X } from "lucide-react";
import { medievalFont } from "@/app/components/medievalFont";
import { useState } from "react";
import { EB_Garamond } from "next/font/google";

const garamondFont = EB_Garamond({
  weight: ["700"],
  subsets: ["latin"],
});

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsDrawer = ({ isOpen, onClose }: SettingsDrawerProps) => {
  const {
    setIsLoggedIn,
    setIsCharacterCreated,
    setCharacter,
    initialCharacter,
    clearMessages,
    resetFilters,
  } = useDnDStore();
  const [showNewGameModal, setShowNewGameModal] = useState(false);

  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsCharacterCreated(false);
    onClose();
  };

  const handleCharacterCreation = () => {
    setIsCharacterCreated(false);
    onClose();
  };

  const handleNewGame = () => {
    setShowNewGameModal(true);
  };

  const confirmNewGame = () => {
    setCharacter(initialCharacter);
    clearMessages();
    resetFilters();
    setIsCharacterCreated(false);
    setShowNewGameModal(false);
    onClose();
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-50 ${
          isOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-black transition-opacity duration-300 ${
            isOpen ? "opacity-50" : "opacity-0"
          }`}
          onClick={onClose}
        />

        {/* Drawer */}
        <div
          className={`fixed right-0 top-0 h-full w-96 bg-base-200 border-l border-primary/15 shadow-xl transition-transform duration-300 rounded-l-lg flex flex-col ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Fixed Header */}
          <div className="p-4 border-b border-base-300 text-neutral-content">
            <div className="flex justify-between items-center">
              <h1 className={`${medievalFont.className} text-2xl text-primary`}>
                Settings
              </h1>
              <button
                className="btn btn-md btn-circle btn-ghost text-base-content/60 hover:text-base-content transition-all duration-200 hover:scale-110"
                onClick={onClose}
                aria-label="Close settings"
              >
                <X size={22} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 p-4 text-neutral-content">
            <div className="space-y-4">
              <button
                className={`btn btn-block bg-base-300 hover:bg-base-200 border border-primary/15 text-base-content ${garamondFont.className}`}
                onClick={handleCharacterCreation}
              >
                Edit Character
              </button>
              <button
                className={`btn btn-block bg-secondary/30 hover:bg-secondary/40 border border-secondary/30 text-secondary-content ${garamondFont.className}`}
                onClick={handleNewGame}
              >
                New Game
              </button>
              <button
                className={`btn btn-block btn-ghost text-error/70 hover:bg-error/10 hover:text-error ${garamondFont.className}`}
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* New Game Confirmation Modal */}
      <dialog className={`modal ${showNewGameModal ? "modal-open" : ""}`}>
        <div className="modal-box bg-base-200 border border-primary/15">
          <h3
            className={`${medievalFont.className} text-2xl text-primary mb-4`}
          >
            Start New Game?
          </h3>
          <p className="text-base-content/70 mb-6">
            Are you sure you want to start a new game? This will erase your
            current character and all chat history. This action cannot be
            undone.
          </p>
          <div className="modal-action">
            <button
              className="btn btn-ghost text-base-content/60"
              onClick={() => setShowNewGameModal(false)}
            >
              Cancel
            </button>
            <button
              className="btn bg-secondary/30 hover:bg-secondary/40 border border-secondary/30 text-secondary-content"
              onClick={confirmNewGame}
            >
              Start New Game
            </button>
          </div>
        </div>
        <form
          method="dialog"
          className="modal-backdrop"
          onClick={() => setShowNewGameModal(false)}
        >
          <button>close</button>
        </form>
      </dialog>
    </>
  );
};

export default SettingsDrawer;
