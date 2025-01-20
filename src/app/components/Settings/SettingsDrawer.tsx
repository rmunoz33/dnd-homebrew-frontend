"use client";

import { useDnDStore } from "@/stores/useStore";
import { X } from "lucide-react";
import { medievalFont } from "@/app/components/medievalFont";

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsDrawer = ({ isOpen, onClose }: SettingsDrawerProps) => {
  const { setIsLoggedIn, setIsCharacterCreated } = useDnDStore();

  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsCharacterCreated(false);
    onClose();
  };

  const handleCharacterCreation = () => {
    setIsCharacterCreated(false);
    onClose();
  };

  return (
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
              className="btn btn-block bg-red-900 hover:bg-red-800 border-none"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsDrawer;
