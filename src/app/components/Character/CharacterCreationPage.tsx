"use client";

import { Character, useDnDStore } from "@/stores/useStore";
import { MedievalSharp } from "next/font/google";
import { generateCharacterDetails } from "@/app/api/openai";
import { useState, useEffect } from "react";
import {
  characterSpecies,
  characterSubspecies,
  characterAlignments,
  characterBackgrounds,
} from "./characterValueOptions";

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
  const [speciesFocusedIndex, setSpeciesFocusedIndex] = useState<number>(-1);
  const [subspeciesFocusedIndex, setSubspeciesFocusedIndex] =
    useState<number>(-1);
  const [alignmentFilter, setAlignmentFilter] = useState("");
  const [isAlignmentDropdownOpen, setIsAlignmentDropdownOpen] = useState(false);
  const [alignmentFocusedIndex, setAlignmentFocusedIndex] =
    useState<number>(-1);
  const [backgroundFilter, setBackgroundFilter] = useState("");
  const [isBackgroundDropdownOpen, setIsBackgroundDropdownOpen] =
    useState(false);
  const [backgroundFocusedIndex, setBackgroundFocusedIndex] =
    useState<number>(-1);

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

  const filteredAlignments = characterAlignments.filter((alignment) =>
    alignment.toLowerCase().includes(alignmentFilter.toLowerCase())
  );

  const filteredBackgrounds = characterBackgrounds.filter((background) =>
    background.toLowerCase().includes(backgroundFilter.toLowerCase())
  );

  // When species changes, reset subspecies
  useEffect(() => {
    handleInputChange("subspecies", "");
    setSubspeciesFilter("");
  }, [character.species]);

  // Update the existing useEffect to handle species being cleared
  useEffect(() => {
    if (!character.species) {
      handleInputChange("subspecies", "");
      setSubspeciesFilter("");
    }
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
      setCharacter(parsedSuggestions);
      setSpeciesFilter(parsedSuggestions.species);
      setSubspeciesFilter(parsedSuggestions.subspecies);
      setAlignmentFilter(parsedSuggestions.alignment);
      setBackgroundFilter(parsedSuggestions.background);
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
      if (!target.closest(".alignment-dropdown")) {
        setIsAlignmentDropdownOpen(false);
      }
      if (!target.closest(".background-dropdown")) {
        setIsBackgroundDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSpeciesKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSpeciesDropdownOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSpeciesFocusedIndex((prev) =>
          prev < filteredSpecies.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSpeciesFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (speciesFocusedIndex >= 0) {
          const selectedSpecies = filteredSpecies[speciesFocusedIndex];
          handleInputChange("species", selectedSpecies);
          setSpeciesFilter(selectedSpecies);
          setIsSpeciesDropdownOpen(false);
          setSpeciesFocusedIndex(-1);
          if (
            !characterSubspecies[
              selectedSpecies as keyof typeof characterSubspecies
            ]
          ) {
            handleInputChange("subspecies", "");
            setSubspeciesFilter("");
          }
        }
        break;
      case "Escape":
        setIsSpeciesDropdownOpen(false);
        setSpeciesFocusedIndex(-1);
        break;
    }
  };

  const handleSubspeciesKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (!isSubspeciesDropdownOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSubspeciesFocusedIndex((prev) =>
          prev < filteredSubspecies.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSubspeciesFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (subspeciesFocusedIndex >= 0) {
          const selectedSubspecies = filteredSubspecies[subspeciesFocusedIndex];
          handleInputChange("subspecies", selectedSubspecies);
          setSubspeciesFilter(selectedSubspecies);
          setIsSubspeciesDropdownOpen(false);
          setSubspeciesFocusedIndex(-1);
        }
        break;
      case "Escape":
        setIsSubspeciesDropdownOpen(false);
        setSubspeciesFocusedIndex(-1);
        break;
    }
  };

  const handleAlignmentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isAlignmentDropdownOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setAlignmentFocusedIndex((prev) =>
          prev < filteredAlignments.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setAlignmentFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (alignmentFocusedIndex >= 0) {
          const selectedAlignment = filteredAlignments[alignmentFocusedIndex];
          handleInputChange("alignment", selectedAlignment);
          setAlignmentFilter(selectedAlignment);
          setIsAlignmentDropdownOpen(false);
          setAlignmentFocusedIndex(-1);
        }
        break;
      case "Escape":
        setIsAlignmentDropdownOpen(false);
        setAlignmentFocusedIndex(-1);
        break;
    }
  };

  const handleBackgroundKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (!isBackgroundDropdownOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setBackgroundFocusedIndex((prev) =>
          prev < filteredBackgrounds.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setBackgroundFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (backgroundFocusedIndex >= 0) {
          const selectedBackground =
            filteredBackgrounds[backgroundFocusedIndex];
          handleInputChange("background", selectedBackground);
          setBackgroundFilter(selectedBackground);
          setIsBackgroundDropdownOpen(false);
          setBackgroundFocusedIndex(-1);
        }
        break;
      case "Escape":
        setIsBackgroundDropdownOpen(false);
        setBackgroundFocusedIndex(-1);
        break;
    }
  };

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
                const newValue = e.target.value;
                setSpeciesFilter(newValue);
                if (!newValue) {
                  handleInputChange("species", "");
                  handleInputChange("subspecies", "");
                  setSubspeciesFilter("");
                  setIsSubspeciesDropdownOpen(false);
                } else {
                  handleInputChange("species", newValue);
                }
                setIsSpeciesDropdownOpen(true);
                setSpeciesFocusedIndex(-1);
              }}
              onFocus={() => setIsSpeciesDropdownOpen(true)}
              onKeyDown={handleSpeciesKeyDown}
            />
            {isSpeciesDropdownOpen && filteredSpecies.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 max-h-60 overflow-auto bg-base-200 rounded-lg shadow-lg">
                {filteredSpecies.map((species, index) => (
                  <li
                    key={species}
                    className={`px-4 py-2 cursor-pointer ${
                      index === speciesFocusedIndex
                        ? "bg-base-300"
                        : "hover:bg-base-300"
                    }`}
                    onClick={() => {
                      handleInputChange("species", species);
                      setSpeciesFilter(species);
                      setIsSpeciesDropdownOpen(false);
                      setSpeciesFocusedIndex(-1);
                      handleInputChange("subspecies", "");
                      setSubspeciesFilter("");
                      setIsSubspeciesDropdownOpen(false);
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
                setSubspeciesFocusedIndex(-1);
              }}
              onFocus={() => setIsSubspeciesDropdownOpen(true)}
              onKeyDown={handleSubspeciesKeyDown}
              disabled={!character.species}
            />
            {isSubspeciesDropdownOpen && filteredSubspecies.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 max-h-60 overflow-auto bg-base-200 rounded-lg shadow-lg">
                {filteredSubspecies.map((subspecies, index) => (
                  <li
                    key={subspecies}
                    className={`px-4 py-2 cursor-pointer ${
                      index === subspeciesFocusedIndex
                        ? "bg-base-300"
                        : "hover:bg-base-300"
                    }`}
                    onClick={() => {
                      handleInputChange("subspecies", subspecies);
                      setSubspeciesFilter(subspecies);
                      setIsSubspeciesDropdownOpen(false);
                      setSubspeciesFocusedIndex(-1);
                    }}
                  >
                    {subspecies}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="relative alignment-dropdown">
            <input
              type="text"
              placeholder="Alignment"
              className="input input-bordered w-full"
              value={alignmentFilter}
              onChange={(e) => {
                setAlignmentFilter(e.target.value);
                setIsAlignmentDropdownOpen(true);
                setAlignmentFocusedIndex(-1);
              }}
              onFocus={() => setIsAlignmentDropdownOpen(true)}
              onKeyDown={handleAlignmentKeyDown}
            />
            {isAlignmentDropdownOpen && filteredAlignments.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 max-h-60 overflow-auto bg-base-200 rounded-lg shadow-lg">
                {filteredAlignments.map((alignment, index) => (
                  <li
                    key={alignment}
                    className={`px-4 py-2 cursor-pointer ${
                      index === alignmentFocusedIndex
                        ? "bg-base-300"
                        : "hover:bg-base-300"
                    }`}
                    onClick={() => {
                      handleInputChange("alignment", alignment);
                      setAlignmentFilter(alignment);
                      setIsAlignmentDropdownOpen(false);
                      setAlignmentFocusedIndex(-1);
                    }}
                  >
                    {alignment}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="relative background-dropdown">
            <input
              type="text"
              placeholder="Background"
              className="input input-bordered w-full"
              value={backgroundFilter}
              onChange={(e) => {
                setBackgroundFilter(e.target.value);
                setIsBackgroundDropdownOpen(true);
                setBackgroundFocusedIndex(-1);
              }}
              onFocus={() => setIsBackgroundDropdownOpen(true)}
              onKeyDown={handleBackgroundKeyDown}
            />
            {isBackgroundDropdownOpen && filteredBackgrounds.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 max-h-60 overflow-auto bg-base-200 rounded-lg shadow-lg">
                {filteredBackgrounds.map((background, index) => (
                  <li
                    key={background}
                    className={`px-4 py-2 cursor-pointer ${
                      index === backgroundFocusedIndex
                        ? "bg-base-300"
                        : "hover:bg-base-300"
                    }`}
                    onClick={() => {
                      handleInputChange("background", background);
                      setBackgroundFilter(background);
                      setIsBackgroundDropdownOpen(false);
                      setBackgroundFocusedIndex(-1);
                    }}
                  >
                    {background}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="col-span-full">
            <textarea
              placeholder="Backstory"
              className="textarea textarea-bordered w-full h-32"
              value={character.backStory}
              onChange={(e) => handleInputChange("backStory", e.target.value)}
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
