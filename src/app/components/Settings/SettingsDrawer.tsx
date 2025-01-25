"use client";

import { useDnDStore } from "@/stores/useStore";
import { X } from "lucide-react";
import { medievalFont } from "@/app/components/medievalFont";
import { useState } from "react";

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
          className={`fixed right-0 top-0 h-full w-96 bg-accent-content shadow-xl transition-transform duration-300 rounded-l-lg flex flex-col ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Fixed Header */}
          <div className="p-4 border-b border-base-300 text-neutral-content">
            <div className="flex justify-between items-center">
              <h1 className={`${medievalFont.className} text-2xl text-red-500`}>
                Settings
              </h1>
              <button
                className="btn btn-ghost btn-circle bg-base-content"
                onClick={onClose}
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 p-4 text-neutral-content">
            <div className="space-y-4">
              <button
                className="btn btn-block bg-base-300 hover:bg-base-200"
                onClick={handleCharacterCreation}
              >
                Edit Character
              </button>
              <button
                className="btn btn-block bg-yellow-900 hover:bg-yellow-800 border-none text-white"
                onClick={handleNewGame}
              >
                New Game
              </button>
              <button
                className="btn btn-block bg-red-900 hover:bg-red-800 border-none"
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
        <div className="modal-box bg-gray-800">
          <h3
            className={`${medievalFont.className} text-2xl text-red-500 mb-4`}
          >
            Start New Game?
          </h3>
          <p className="text-gray-200 mb-6">
            Are you sure you want to start a new game? This will erase your
            current character and all chat history. This action cannot be
            undone.
          </p>
          <div className="modal-action">
            <button
              className="btn bg-gray-600 hover:bg-gray-700 text-white"
              onClick={() => setShowNewGameModal(false)}
            >
              Cancel
            </button>
            <button
              className="btn bg-yellow-900 hover:bg-yellow-800 border-none text-white"
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
