"use client";

import { Character, useDnDStore } from "@/stores/useStore";
import { MedievalSharp } from "next/font/google";
import { generateCharacterDetails } from "@/app/api/openai";
import { useState, useEffect } from "react";
import { characterSpecies, characterSubspecies } from "./characterValueOptions";

const medievalFont = MedievalSharp({
  weight: "400",
  subsets: ["latin"],
});

const CharacterCreationPage = () => {
  const { character, setCharacter, setIsCharacterCreated } = useDnDStore();
  const [isRolling, setIsRolling] = useState(false);
  const [speciesFilter, setSpeciesFilter] = useState("");
  const [subspeciesFilter, setSubspeciesFilter] = useState("");
  const [isSpeciesDropdownOpen, setIsSpeciesDropdownOpen] = useState(false);
  const [isSubspeciesDropdownOpen, setIsSubspeciesDropdownOpen] =
    useState(false);

  const filteredSpecies = characterSpecies.filter((species) =>
    species.toLowerCase().includes(speciesFilter.toLowerCase())
  );

  const availableSubspecies = character.species
    ? characterSubspecies[
        character.species as keyof typeof characterSubspecies
      ] || []
    : [];
  const filteredSubspecies = availableSubspecies.filter((subspecies) =>
    subspecies.toLowerCase().includes(subspeciesFilter.toLowerCase())
  );

  // When species changes, reset subspecies
  useEffect(() => {
    handleInputChange("subspecies", "");
    setSubspeciesFilter("");
  }, [character.species]);

  const handleInputChange = (field: keyof Character, value: any) => {
    setCharacter({ ...character, [field]: value });
  };

  const isCharacterDetailsComplete = () => {
    return (
      character.name.trim() !== "" &&
      character.species.trim() !== "" &&
      character.subspecies.trim() !== "" &&
      character.background.trim() !== "" &&
      character.alignment.trim() !== ""
    );
  };

  const handleAISuggestions = async () => {
    setIsRolling(true);
    try {
      const suggestions = await generateCharacterDetails(character);
      const parsedSuggestions = JSON.parse(suggestions as string) as Character;

      // Update character with suggestions
      setCharacter(parsedSuggestions);

      // Update the filter states to match the new values
      setSpeciesFilter(parsedSuggestions.species);
      setSubspeciesFilter(parsedSuggestions.subspecies);
    } catch (error) {
      console.error("Error getting AI suggestions:", error);
    } finally {
      setIsRolling(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".species-dropdown")) {
        setIsSpeciesDropdownOpen(false);
      }
      if (!target.closest(".subspecies-dropdown")) {
        setIsSubspeciesDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-800">
      <div className="flex flex-col items-center gap-8 w-full max-w-2xl p-8 bg-gray-800 mx-auto">
        <div className="flex flex-col items-center gap-4">
          <h1 className={`${medievalFont.className} text-5xl text-red-500`}>
            Create Your Character
          </h1>
          <button
            className="btn btn-sm"
            onClick={handleAISuggestions}
            disabled={isRolling}
          >
            {isRolling ? (
              <span className="animate-spin bg-white">🎲</span>
            ) : (
              "Roll Me a Character"
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-xl">
          <h2 className="text-xl text-white font-bold col-span-full mb-2">
            Character Details
          </h2>
          <input
            type="text"
            placeholder="Name"
            className="input input-bordered w-full"
            value={character.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
          />
          <div className="relative species-dropdown">
            <input
              type="text"
              placeholder="Species"
              className="input input-bordered w-full"
              value={speciesFilter}
              onChange={(e) => {
                setSpeciesFilter(e.target.value);
                setIsSpeciesDropdownOpen(true);
              }}
              onFocus={() => setIsSpeciesDropdownOpen(true)}
            />
            {isSpeciesDropdownOpen && filteredSpecies.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 max-h-60 overflow-auto bg-base-200 rounded-lg shadow-lg">
                {filteredSpecies.map((species) => (
                  <li
                    key={species}
                    className="px-4 py-2 hover:bg-base-300 cursor-pointer"
                    onClick={() => {
                      handleInputChange("species", species);
                      setSpeciesFilter(species);
                      setIsSpeciesDropdownOpen(false);
                    }}
                  >
                    {species}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="relative subspecies-dropdown">
            <input
              type="text"
              placeholder="Subspecies"
              className="input input-bordered w-full"
              value={subspeciesFilter}
              onChange={(e) => {
                setSubspeciesFilter(e.target.value);
                setIsSubspeciesDropdownOpen(true);
              }}
              onFocus={() => setIsSubspeciesDropdownOpen(true)}
              disabled={!character.species}
            />
            {isSubspeciesDropdownOpen && filteredSubspecies.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 max-h-60 overflow-auto bg-base-200 rounded-lg shadow-lg">
                {filteredSubspecies.map((subspecies) => (
                  <li
                    key={subspecies}
                    className="px-4 py-2 hover:bg-base-300 cursor-pointer"
                    onClick={() => {
                      handleInputChange("subspecies", subspecies);
                      setSubspeciesFilter(subspecies);
                      setIsSubspeciesDropdownOpen(false);
                    }}
                  >
                    {subspecies}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <select
            className="select select-bordered w-full"
            value={character.alignment}
            onChange={(e) => handleInputChange("alignment", e.target.value)}
          >
            <option value="">Select Alignment</option>
            <option value="Lawful Good">Lawful Good</option>
            <option value="Neutral Good">Neutral Good</option>
            <option value="Chaotic Good">Chaotic Good</option>
            <option value="Lawful Neutral">Lawful Neutral</option>
            <option value="True Neutral">True Neutral</option>
            <option value="Chaotic Neutral">Chaotic Neutral</option>
            <option value="Lawful Evil">Lawful Evil</option>
            <option value="Neutral Evil">Neutral Evil</option>
            <option value="Chaotic Evil">Chaotic Evil</option>
          </select>
          <div className="col-span-full">
            <textarea
              placeholder="Background"
              className="textarea textarea-bordered w-full h-32"
              value={character.background}
              onChange={(e) => handleInputChange("background", e.target.value)}
            />
          </div>

          <h2 className="text-xl text-white font-bold col-span-full mt-6 mb-2">
            Attributes
          </h2>
          <div className="col-span-full grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              "strength",
              "dexterity",
              "constitution",
              "intelligence",
              "wisdom",
              "charisma",
              "honor",
              "sanity",
            ].map((stat) => (
              <div key={stat} className="form-control">
                <label className="label">
                  <span className="label-text text-white capitalize">
                    {stat}
                  </span>
                </label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={String(character[stat as keyof Character] ?? "")}
                  min="1"
                  max="30"
                  onChange={(e) =>
                    handleInputChange(
                      stat as keyof Character,
                      Math.min(30, Math.max(1, parseInt(e.target.value) || 1))
                    )
                  }
                />
              </div>
            ))}
          </div>

          <h2 className="text-xl text-white font-bold col-span-full mt-6 mb-2">
            Currency
          </h2>
          <div className="col-span-full grid grid-cols-3 md:grid-cols-5 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text text-white">Platinum</span>
              </label>
              <input
                type="number"
                className="input input-bordered w-full"
                value={String(character.money.platinum)}
                min="0"
                onChange={(e) =>
                  handleInputChange("money", {
                    ...character.money,
                    platinum: Math.max(0, parseInt(e.target.value) || 0),
                  })
                }
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text text-white">Gold</span>
              </label>
              <input
                type="number"
                className="input input-bordered w-full"
                value={String(character.money.gold)}
                min="0"
                onChange={(e) =>
                  handleInputChange("money", {
                    ...character.money,
                    gold: Math.max(0, parseInt(e.target.value) || 0),
                  })
                }
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text text-white">Electrum</span>
              </label>
              <input
                type="number"
                className="input input-bordered w-full"
                value={String(character.money.electrum)}
                min="0"
                onChange={(e) =>
                  handleInputChange("money", {
                    ...character.money,
                    electrum: Math.max(0, parseInt(e.target.value) || 0),
                  })
                }
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text text-white">Silver</span>
              </label>
              <input
                type="number"
                className="input input-bordered w-full"
                value={String(character.money.silver)}
                min="0"
                onChange={(e) =>
                  handleInputChange("money", {
                    ...character.money,
                    silver: Math.max(0, parseInt(e.target.value) || 0),
                  })
                }
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text text-white">Copper</span>
              </label>
              <input
                type="number"
                className="input input-bordered w-full"
                value={String(character.money.copper)}
                min="0"
                onChange={(e) =>
                  handleInputChange("money", {
                    ...character.money,
                    copper: Math.max(0, parseInt(e.target.value) || 0),
                  })
                }
              />
            </div>
          </div>

          <div className="col-span-full">
            <button
              className="btn mt-8"
              disabled={!isCharacterDetailsComplete()}
              onClick={() => setIsCharacterCreated(true)}
            >
              Create Character
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterCreationPage;
