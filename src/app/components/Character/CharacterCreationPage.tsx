"use client";

import { Character, useDnDStore, initialCharacter } from "@/stores/useStore";
import { medievalFont } from "@/app/components/medievalFont";
import { generateCharacterDetails } from "@/app/api/openai";
import { useState, useEffect } from "react";
import {
  characterSpecies,
  characterSubspecies,
  characterAlignments,
  characterBackgrounds,
  characterClasses,
} from "./characterValueOptions";

const CharacterCreationPage = () => {
  const {
    character,
    setCharacter,
    setIsCharacterCreated,
    filters,
    setFilter,
    resetFilters,
  } = useDnDStore();
  const [isRolling, setIsRolling] = useState(false);
  const [isSpeciesDropdownOpen, setIsSpeciesDropdownOpen] = useState(false);
  const [isSubspeciesDropdownOpen, setIsSubspeciesDropdownOpen] =
    useState(false);
  const [isAlignmentDropdownOpen, setIsAlignmentDropdownOpen] = useState(false);
  const [isBackgroundDropdownOpen, setIsBackgroundDropdownOpen] =
    useState(false);
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const [isSubclassDropdownOpen, setIsSubclassDropdownOpen] = useState(false);
  const [speciesFocusedIndex, setSpeciesFocusedIndex] = useState<number>(-1);
  const [subspeciesFocusedIndex, setSubspeciesFocusedIndex] =
    useState<number>(-1);
  const [alignmentFocusedIndex, setAlignmentFocusedIndex] =
    useState<number>(-1);
  const [backgroundFocusedIndex, setBackgroundFocusedIndex] =
    useState<number>(-1);
  const [classFocusedIndex, setClassFocusedIndex] = useState<number>(-1);
  const [subclassFocusedIndex, setSubclassFocusedIndex] = useState<number>(-1);

  const filteredSpecies = characterSpecies.filter((species) =>
    species.toLowerCase().includes(filters.species.toLowerCase())
  );

  const availableSubspecies = filters.species
    ? characterSubspecies[
        filters.species as keyof typeof characterSubspecies
      ] || []
    : [];

  const filteredSubspecies = availableSubspecies.filter((subspecies) =>
    subspecies.toLowerCase().includes(filters.subspecies.toLowerCase())
  );

  const filteredAlignments = characterAlignments.filter((alignment) =>
    alignment.toLowerCase().includes(filters.alignment.toLowerCase())
  );

  const filteredBackgrounds = characterBackgrounds.filter((background) =>
    background.toLowerCase().includes(filters.background.toLowerCase())
  );

  const filteredClasses = characterClasses.filter(
    (className) =>
      className.toLowerCase().includes(filters.class.toLowerCase()) &&
      !character.classes.includes(className)
  );

  const filteredSubclasses = characterClasses.filter(
    (className) =>
      className.toLowerCase().includes(filters.subclass.toLowerCase()) &&
      !character.subClass
  );

  // When species changes, reset subspecies if needed
  useEffect(() => {
    const hasSubspecies =
      characterSubspecies[
        character.species as keyof typeof characterSubspecies
      ];

    // Only reset subspecies if the species doesn't have subspecies
    if (!hasSubspecies) {
      handleInputChange("subspecies", "");
      setFilter("subspecies", "");
    }
    setIsSubspeciesDropdownOpen(false);
    setSubspeciesFocusedIndex(-1);
  }, [character.species]);

  const handleInputChange = (field: keyof Character, value: any) => {
    const newCharacter = { ...character, [field]: value };
    setCharacter(newCharacter);
  };

  const isCharacterDetailsComplete = () => {
    const hasRequiredSubspecies =
      !characterSubspecies[
        character.species as keyof typeof characterSubspecies
      ] || character.subspecies.trim() !== "";

    const hasRequiredSubclass =
      (character.level ?? 1) < 3 || character.subClass.trim() !== "";

    return (
      character.name.trim() !== "" &&
      character.level >= 1 &&
      character.species.trim() !== "" &&
      hasRequiredSubspecies &&
      character.background.trim() !== "" &&
      character.alignment.trim() !== "" &&
      character.classes.length > 0 &&
      hasRequiredSubclass
    );
  };

  const handleAISuggestions = async () => {
    setIsRolling(true);
    try {
      const suggestions = await generateCharacterDetails(character);
      const parsedSuggestions = JSON.parse(suggestions as string) as Character;
      setCharacter(parsedSuggestions);
      setFilter("species", parsedSuggestions.species);
      setFilter("subspecies", parsedSuggestions.subspecies);
      setFilter("alignment", parsedSuggestions.alignment);
      setFilter("background", parsedSuggestions.background);
    } catch (error) {
      console.error("Error getting AI suggestions:", error);
    } finally {
      setIsRolling(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      event.stopPropagation();
      const target = event.target as HTMLElement;
      const classDropdown = target.closest(".class-dropdown");
      const speciesDropdown = target.closest(".species-dropdown");
      const subspeciesDropdown = target.closest(".subspecies-dropdown");
      const alignmentDropdown = target.closest(".alignment-dropdown");
      const backgroundDropdown = target.closest(".background-dropdown");
      const subclassDropdown = target.closest(".subclass-dropdown");

      if (!classDropdown) {
        setIsClassDropdownOpen(false);
      }
      if (!speciesDropdown) {
        setIsSpeciesDropdownOpen(false);
      }
      if (!subspeciesDropdown) {
        setIsSubspeciesDropdownOpen(false);
      }
      if (!alignmentDropdown) {
        setIsAlignmentDropdownOpen(false);
      }
      if (!backgroundDropdown) {
        setIsBackgroundDropdownOpen(false);
      }
      if (!subclassDropdown) {
        setIsSubclassDropdownOpen(false);
      }
    };

    document.addEventListener("mouseup", handleClickOutside);
    return () => document.removeEventListener("mouseup", handleClickOutside);
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
          setFilter("species", selectedSpecies);
          setIsSpeciesDropdownOpen(false);
          setSpeciesFocusedIndex(-1);
          if (
            !characterSubspecies[
              selectedSpecies as keyof typeof characterSubspecies
            ]
          ) {
            handleInputChange("subspecies", "");
            setFilter("subspecies", "");
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
          setFilter("subspecies", selectedSubspecies);
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
          setFilter("alignment", selectedAlignment);
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
          setFilter("background", selectedBackground);
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

  const handleClassKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isClassDropdownOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setClassFocusedIndex((prev) =>
          prev < filteredClasses.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setClassFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (classFocusedIndex >= 0) {
          const selectedClass = filteredClasses[classFocusedIndex];
          if (character.classes.length < 3) {
            handleInputChange("classes", [...character.classes, selectedClass]);
          }
          setFilter("class", "");
          setIsClassDropdownOpen(false);
          setClassFocusedIndex(-1);
        }
        break;
      case "Escape":
        setIsClassDropdownOpen(false);
        setClassFocusedIndex(-1);
        break;
    }
  };

  const removeClass = (classToRemove: string) => {
    handleInputChange(
      "classes",
      character.classes.filter((c) => c !== classToRemove)
    );
  };

  const handleSubclassKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSubclassDropdownOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSubclassFocusedIndex((prev) =>
          prev < filteredSubclasses.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSubclassFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (subclassFocusedIndex >= 0) {
          const selectedSubclass = filteredSubclasses[subclassFocusedIndex];
          handleInputChange("subClass", selectedSubclass);
          setFilter("subclass", selectedSubclass);
          setIsSubclassDropdownOpen(false);
          setSubclassFocusedIndex(-1);
        }
        break;
      case "Escape":
        setIsSubclassDropdownOpen(false);
        setSubclassFocusedIndex(-1);
        break;
    }
  };

  const addEquipment = (
    category: keyof typeof character.equipment,
    value: string,
    setInput: (value: string) => void
  ) => {
    if (value.trim()) {
      handleInputChange("equipment", {
        ...character.equipment,
        [category]: [...(character.equipment?.[category] || []), value.trim()],
      });
      setInput("");
    }
  };

  const removeEquipment = (
    category: keyof typeof character.equipment,
    itemToRemove: string
  ) => {
    handleInputChange("equipment", {
      ...character.equipment,
      [category]: character.equipment[category].filter(
        (item) => item !== itemToRemove
      ),
    });
  };

  const isCharacterModified = () => {
    return JSON.stringify(character) !== JSON.stringify(initialCharacter);
  };

  const handleReset = () => {
    setCharacter(initialCharacter);
    resetFilters();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#3f3f3f]">
      <div className="flex flex-col items-center gap-8 w-full max-w-2xl p-8 mx-auto">
        <div className="flex flex-col items-center gap-4">
          <h1 className={`${medievalFont.className} text-5xl text-red-500`}>
            Create Your Character
          </h1>
          <div className="flex gap-2">
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
            {isCharacterModified() && (
              <button className="btn btn-sm" onClick={handleReset}>
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-xl">
          <h2 className="text-xl text-white font-bold col-span-full mb-2">
            Character Details
          </h2>
          <input
            type="text"
            placeholder="Name *"
            className="input input-bordered w-full"
            value={character.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
          />
          <input
            type="number"
            placeholder="Level *"
            className="input input-bordered w-full"
            value={String(character.level ?? 1)}
            min="1"
            max="20"
            onChange={(e) =>
              handleInputChange(
                "level",
                Math.min(20, Math.max(1, parseInt(e.target.value) || 1))
              )
            }
          />
          <div className="relative species-dropdown">
            <input
              type="text"
              placeholder="Species *"
              className="input input-bordered w-full"
              value={filters.species}
              onChange={(e) => {
                const newValue = e.target.value;
                setFilter("species", newValue);
                if (!newValue) {
                  handleInputChange("species", "");
                  handleInputChange("subspecies", "");
                  setFilter("subspecies", "");
                  setIsSubspeciesDropdownOpen(false);
                } else if (characterSpecies.includes(newValue)) {
                  handleInputChange("species", newValue);
                }
                setIsSpeciesDropdownOpen(true);
                setSpeciesFocusedIndex(-1);
              }}
              onBlur={() => {
                if (!characterSpecies.includes(filters.species)) {
                  setFilter("species", "");
                  handleInputChange("species", "");
                  handleInputChange("subspecies", "");
                  setFilter("subspecies", "");
                  setIsSubspeciesDropdownOpen(false);
                } else {
                  handleInputChange("species", filters.species);
                }
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
                      setFilter("species", species);
                      setIsSpeciesDropdownOpen(false);
                      setSpeciesFocusedIndex(-1);
                      handleInputChange("subspecies", "");
                      setFilter("subspecies", "");
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
              placeholder={
                characterSubspecies[
                  character.species as keyof typeof characterSubspecies
                ]
                  ? "Subspecies *"
                  : "Subspecies"
              }
              className="input input-bordered w-full"
              value={filters.subspecies}
              onChange={(e) => {
                const newValue = e.target.value;
                setFilter("subspecies", newValue);
                handleInputChange("subspecies", newValue);
                setIsSubspeciesDropdownOpen(true);
                setSubspeciesFocusedIndex(-1);
              }}
              onFocus={() => {
                if (character.species && availableSubspecies.length > 0) {
                  setIsSubspeciesDropdownOpen(true);
                }
              }}
              onBlur={() => {
                if (!availableSubspecies.includes(filters.subspecies)) {
                  setFilter("subspecies", "");
                  handleInputChange("subspecies", "");
                }
              }}
              onKeyDown={handleSubspeciesKeyDown}
              disabled={
                !character.species ||
                !characterSubspecies[
                  character.species as keyof typeof characterSubspecies
                ]
              }
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
                      setFilter("subspecies", subspecies);
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
              placeholder="Alignment *"
              className="input input-bordered w-full"
              value={filters.alignment}
              onChange={(e) => {
                setFilter("alignment", e.target.value);
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
                      setFilter("alignment", alignment);
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
              placeholder="Background *"
              className="input input-bordered w-full"
              value={filters.background}
              onChange={(e) => {
                setFilter("background", e.target.value);
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
                      setFilter("background", background);
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
            Classes
          </h2>
          <div className="relative class-dropdown">
            <div className="flex flex-wrap gap-2 mb-2">
              {character.classes.map((className) => (
                <span
                  key={className}
                  className="badge badge-neutral-content gap-2"
                >
                  {className}
                  <button
                    onClick={() => removeClass(className)}
                    className="btn btn-xs btn-ghost"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add Class (max 3) *"
              className="input input-bordered w-full"
              value={filters.class}
              onChange={(e) => {
                setFilter("class", e.target.value);
                setIsClassDropdownOpen(true);
                setClassFocusedIndex(-1);
              }}
              onFocus={() => setIsClassDropdownOpen(true)}
              onBlur={(e) => {
                // Only close if the related target is not within the dropdown
                const relatedTarget = e.relatedTarget as HTMLElement;
                if (!relatedTarget?.closest(".class-dropdown")) {
                  setTimeout(() => {
                    setIsClassDropdownOpen(false);
                  }, 200);
                }
              }}
              onKeyDown={handleClassKeyDown}
              disabled={character.classes.length >= 3}
            />
            {isClassDropdownOpen && filteredClasses.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 max-h-60 overflow-auto bg-base-200 rounded-lg shadow-lg">
                {filteredClasses.map((className, index) => (
                  <li
                    key={className}
                    className={`px-4 py-2 cursor-pointer ${
                      index === classFocusedIndex
                        ? "bg-base-300"
                        : "hover:bg-base-300"
                    }`}
                    onClick={() => {
                      if (character.classes.length < 3) {
                        handleInputChange("classes", [
                          ...character.classes,
                          className,
                        ]);
                        setFilter("class", "");
                        setIsClassDropdownOpen(false);
                        setClassFocusedIndex(-1);
                      }
                    }}
                  >
                    {className}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="relative subclass-dropdown mt-2">
            <input
              type="text"
              placeholder={
                (character.level ?? 1) < 3
                  ? "Reach level 3 to select a subclass"
                  : (character.level ?? 1) >= 3
                  ? "Add Subclass *"
                  : "Add Subclass"
              }
              className="input input-bordered w-full"
              value={filters.subclass}
              onChange={(e) => {
                const newValue = e.target.value;
                setFilter("subclass", newValue);
                if (!newValue) {
                  handleInputChange("subClass", "");
                } else if (characterClasses.includes(newValue)) {
                  handleInputChange("subClass", newValue);
                }
                setIsSubclassDropdownOpen(true);
                setSubclassFocusedIndex(-1);
              }}
              onBlur={(e) => {
                // Only close if the related target is not within the dropdown
                const relatedTarget = e.relatedTarget as HTMLElement;
                if (!relatedTarget?.closest(".subclass-dropdown")) {
                  setTimeout(() => {
                    setIsSubclassDropdownOpen(false);
                  }, 200);
                }
                if (!characterClasses.includes(filters.subclass)) {
                  setFilter("subclass", "");
                  handleInputChange("subClass", "");
                }
              }}
              onFocus={() => setIsSubclassDropdownOpen(true)}
              onKeyDown={handleSubclassKeyDown}
              disabled={(character.level ?? 1) < 3}
            />
            {isSubclassDropdownOpen && filteredSubclasses.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 max-h-60 overflow-auto bg-base-200 rounded-lg shadow-lg">
                {filteredSubclasses.map((className, index) => (
                  <li
                    key={className}
                    className={`px-4 py-2 cursor-pointer ${
                      index === subclassFocusedIndex
                        ? "bg-base-300"
                        : "hover:bg-base-300"
                    }`}
                    onClick={() => {
                      handleInputChange("subClass", className);
                      setFilter("subclass", className);
                      setIsSubclassDropdownOpen(false);
                      setSubclassFocusedIndex(-1);
                    }}
                  >
                    {className}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <h2 className="text-xl text-white font-bold col-span-full mt-6 mb-2">
            Equipment
          </h2>

          <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-white mb-2">Weapons</h3>
              <div className="flex flex-wrap gap-2 mb-2">
                {(character.equipment?.weapons || []).map((weapon) => (
                  <span
                    key={weapon}
                    className="badge badge-neutral-content gap-2"
                  >
                    {weapon}
                    <button
                      onClick={() => removeEquipment("weapons", weapon)}
                      className="btn btn-xs btn-ghost"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Add weapon"
                className="input input-bordered w-full"
                value={filters.weapon}
                onChange={(e) => setFilter("weapon", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addEquipment("weapons", filters.weapon, () =>
                      setFilter("weapon", "")
                    );
                  }
                }}
              />
            </div>

            <div>
              <h3 className="text-white mb-2">Armor</h3>
              <div className="flex flex-wrap gap-2 mb-2">
                {(character.equipment?.armor || []).map((armor) => (
                  <span
                    key={armor}
                    className="badge badge-neutral-content gap-2"
                  >
                    {armor}
                    <button
                      onClick={() => removeEquipment("armor", armor)}
                      className="btn btn-xs btn-ghost"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Add armor"
                className="input input-bordered w-full"
                value={filters.armor}
                onChange={(e) => setFilter("armor", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addEquipment("armor", filters.armor, () =>
                      setFilter("armor", "")
                    );
                  }
                }}
              />
            </div>

            <div>
              <h3 className="text-white mb-2">Tools</h3>
              <div className="flex flex-wrap gap-2 mb-2">
                {(character.equipment?.tools || []).map((tool) => (
                  <span
                    key={tool}
                    className="badge badge-neutral-content gap-2"
                  >
                    {tool}
                    <button
                      onClick={() => removeEquipment("tools", tool)}
                      className="btn btn-xs btn-ghost"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Add tool"
                className="input input-bordered w-full"
                value={filters.tool}
                onChange={(e) => setFilter("tool", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addEquipment("tools", filters.tool, () =>
                      setFilter("tool", "")
                    );
                  }
                }}
              />
            </div>

            <div>
              <h3 className="text-white mb-2">Magic Items</h3>
              <div className="flex flex-wrap gap-2 mb-2">
                {(character.equipment?.magicItems || []).map((item) => (
                  <span
                    key={item}
                    className="badge badge-neutral-content gap-2"
                  >
                    {item}
                    <button
                      onClick={() => removeEquipment("magicItems", item)}
                      className="btn btn-xs btn-ghost"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Add magic item"
                className="input input-bordered w-full"
                value={filters.magicItem}
                onChange={(e) => setFilter("magicItem", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addEquipment("magicItems", filters.magicItem, () =>
                      setFilter("magicItem", "")
                    );
                  }
                }}
              />
            </div>

            <div className="md:col-span-2">
              <h3 className="text-white mb-2">Other Items</h3>
              <div className="flex flex-wrap gap-2 mb-2">
                {(character.equipment?.items || []).map((item) => (
                  <span
                    key={item}
                    className="badge badge-neutral-content gap-2"
                  >
                    {item}
                    <button
                      onClick={() => removeEquipment("items", item)}
                      className="btn btn-xs btn-ghost"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Add item"
                className="input input-bordered w-full"
                value={filters.item}
                onChange={(e) => setFilter("item", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addEquipment("items", filters.item, () =>
                      setFilter("item", "")
                    );
                  }
                }}
              />
            </div>
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

          <div className="col-span-full mt-2 text-sm text-gray-400">
            * Required fields
          </div>
          <div className="col-span-full">
            <button
              className="btn mt-8"
              disabled={!isCharacterDetailsComplete()}
              onClick={() => setIsCharacterCreated(true)}
            >
              Save Character
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterCreationPage;
