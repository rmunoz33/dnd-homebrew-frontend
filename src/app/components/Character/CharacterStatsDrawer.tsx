"use client";

import { useDnDStore } from "@/stores/useStore";
import { X } from "lucide-react";
import { medievalFont } from "@/app/components/medievalFont";

interface CharacterStatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CharacterStatsDrawer = ({
  isOpen,
  onClose,
}: CharacterStatsDrawerProps) => {
  const { character } = useDnDStore();

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
              Character Stats
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
        <div className="flex-1 overflow-y-auto p-4 text-neutral-content">
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3
                className={`${medievalFont.className} text-xl text-red-500 font-semibold mb-2`}
              >
                Basic Info
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>Name: {character.name}</div>
                <div>Level: {character.level}</div>
                <div>Species: {character.species}</div>
                {character.subspecies && (
                  <div>Subspecies: {character.subspecies}</div>
                )}
                <div>Alignment: {character.alignment}</div>
                <div>Background: {character.background}</div>
              </div>
            </div>

            {/* Classes */}
            <div>
              <h3
                className={`${medievalFont.className} text-xl text-red-500 font-semibold mb-2`}
              >
                Classes
              </h3>
              <div>
                {character.classes[0]}{" "}
                {character.subClass && `(${character.subClass})`}
              </div>
            </div>

            {/* Attributes */}
            <div>
              <h3
                className={`${medievalFont.className} text-xl text-red-500 font-semibold mb-2`}
              >
                Attributes
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>Strength: {character.strength}</div>
                <div>Dexterity: {character.dexterity}</div>
                <div>Constitution: {character.constitution}</div>
                <div>Intelligence: {character.intelligence}</div>
                <div>Wisdom: {character.wisdom}</div>
                <div>Charisma: {character.charisma}</div>
              </div>
            </div>

            {/* Equipment */}
            <div>
              <h3
                className={`${medievalFont.className} text-xl text-red-500 font-semibold mb-2`}
              >
                Equipment
              </h3>
              <div className="space-y-2">
                {Object.entries(character.equipment).map(
                  ([category, items]) =>
                    items.length > 0 && (
                      <div key={category}>
                        <h4 className="font-bold capitalize text-red-400">
                          {category}
                        </h4>
                        {items.map((item: string, index: number) => (
                          <div key={`${category}-${index}`}>{item}</div>
                        ))}
                      </div>
                    )
                )}
              </div>
            </div>

            {/* Currency */}
            <div>
              <h3
                className={`${medievalFont.className} text-xl text-red-500 font-semibold mb-2`}
              >
                Currency
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>Copper: {character.money.copper}</div>
                <div>Silver: {character.money.silver}</div>
                <div>Electrum: {character.money.electrum}</div>
                <div>Gold: {character.money.gold}</div>
                <div>Platinum: {character.money.platinum}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterStatsDrawer;
