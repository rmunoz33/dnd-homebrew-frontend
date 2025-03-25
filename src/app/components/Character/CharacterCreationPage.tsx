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
  characterSubclasses,
} from "./characterValueOptions";
import React, { useRef } from "react";

interface NumberInputProps {
  value: string | number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  min = 0,
  max = Infinity,
  placeholder,
  disabled = false,
  className = "input input-bordered w-full",
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue =
      e.target.value === "" ? min : parseInt(e.target.value) || min;
    onChange(Math.min(max, Math.max(min, newValue)));
  };

  const increment = () => {
    const currentValue =
      typeof value === "string" ? parseInt(value) || min : value;
    if (currentValue < max) {
      onChange(currentValue + 1);
    }
  };

  const decrement = () => {
    const currentValue =
      typeof value === "string" ? parseInt(value) || min : value;
    if (currentValue > min) {
      onChange(currentValue - 1);
    }
  };

  return (
    <div className="relative flex">
      <input
        type="number"
        className={className}
        value={value}
        onChange={handleChange}
        min={min}
        max={max}
        placeholder={placeholder}
        disabled={disabled}
      />
      <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-center pr-2">
        <button
          type="button"
          className="text-gray-500 hover:text-gray-700 focus:outline-none"
          onClick={increment}
          disabled={
            disabled ||
            (typeof value === "number"
              ? value >= max
              : parseInt(value as string) >= max)
          }
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
        </button>
        <button
          type="button"
          className="text-gray-500 hover:text-gray-700 focus:outline-none"
          onClick={decrement}
          disabled={
            disabled ||
            (typeof value === "number"
              ? value <= min
              : parseInt(value as string) <= min)
          }
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

// First, let's create a reusable component for the dropdown inputs with clear button
interface ClearableInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder: string;
  onFocus?: () => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  className?: string;
}

const ClearableInput: React.FC<ClearableInputProps> = ({
  value,
  onChange,
  onClear,
  placeholder,
  onFocus,
  onBlur,
  onKeyDown,
  disabled = false,
  className = "input input-bordered w-full",
}) => {
  return (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        disabled={disabled}
      />
      {value && (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
          onClick={onClear}
          disabled={disabled}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

const CharacterCreationPage = () => {
  const {
    character,
    setCharacter,
    setIsCharacterCreated,
    filters,
    setFilter,
    resetFilters,
    messages,
    clearMessages,
  } = useDnDStore();
  const [isRolling, setIsRolling] = useState(false);
  const [showResetWarning, setShowResetWarning] = useState(false);
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

  const filteredSubclasses =
    character.classes.length > 0
      ? character.classes.flatMap((className) =>
          (
            characterSubclasses[
              className as keyof typeof characterSubclasses
            ] || []
          ).filter((subclass) =>
            subclass.toLowerCase().includes(filters.subclass.toLowerCase())
          )
        )
      : [];

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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.species]);

  const handleInputChange = (
    field: keyof Character,
    value: Character[keyof Character]
  ) => {
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
    // Check if there are existing messages and show warning if needed
    if (messages.length > 0) {
      setShowResetWarning(true);
      return;
    }

    // Otherwise proceed with character generation
    await generateRandomCharacter();
  };

  const generateRandomCharacter = async () => {
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

  const handleConfirmReset = () => {
    clearMessages(); // Clear all chat messages
    setShowResetWarning(false);
    generateRandomCharacter();
  };

  const speciesDropdownRef = useRef<HTMLUListElement>(null);
  const subspeciesDropdownRef = useRef<HTMLUListElement>(null);
  const alignmentDropdownRef = useRef<HTMLUListElement>(null);
  const backgroundDropdownRef = useRef<HTMLUListElement>(null);
  const classDropdownRef = useRef<HTMLUListElement>(null);
  const subclassDropdownRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      event.stopPropagation();
      const target = event.target as HTMLElement;

      if (!target.closest(".class-dropdown")) {
        setIsClassDropdownOpen(false);
      }

      if (
        speciesDropdownRef.current &&
        !speciesDropdownRef.current.contains(target) &&
        !target.closest(".species-dropdown")
      ) {
        setIsSpeciesDropdownOpen(false);
      }

      if (
        subspeciesDropdownRef.current &&
        !subspeciesDropdownRef.current.contains(target) &&
        !target.closest(".subspecies-dropdown")
      ) {
        setIsSubspeciesDropdownOpen(false);
      }

      if (
        alignmentDropdownRef.current &&
        !alignmentDropdownRef.current.contains(target) &&
        !target.closest(".alignment-dropdown")
      ) {
        setIsAlignmentDropdownOpen(false);
      }

      if (
        backgroundDropdownRef.current &&
        !backgroundDropdownRef.current.contains(target) &&
        !target.closest(".background-dropdown")
      ) {
        setIsBackgroundDropdownOpen(false);
      }

      if (!target.closest(".subclass-dropdown")) {
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
      {/* Reset Warning Modal */}
      {showResetWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-200 p-6 rounded-lg shadow-xl max-w-md border-2 border-red-500">
            <h3 className="text-xl font-bold mb-4 text-red-500">
              Reset Adventure?
            </h3>
            <p className="mb-6 text-gray-800">
              Generating a new character will reset your current adventure and
              clear all chat messages. Are you sure you want to continue?
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="btn bg-gray-600 hover:bg-gray-700 text-white border-none"
                onClick={() => setShowResetWarning(false)}
              >
                Cancel
              </button>
              <button
                className="btn bg-red-500 hover:bg-red-600 text-white border-none"
                onClick={handleConfirmReset}
              >
                Reset Adventure
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-8 w-full max-w-2xl p-8 mx-auto">
        <div className="flex flex-col items-center gap-4">
          <h1 className={`${medievalFont.className} text-5xl text-red-500`}>
            Create Your Character
          </h1>
          <div className="text-center text-white mb-2 max-w-lg">
            <p>
              Fields left at default values will be generated when you click{" "}
              <span className="font-bold">
                &ldquo;Roll Me a Character&rdquo;
              </span>
              . Values you&apos;ve already customized will not be changed.
              Adjust any fields as needed before saving.
            </p>
          </div>
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
          <NumberInput
            value={String(character.level ?? 1)}
            min={1}
            max={20}
            placeholder="Level *"
            onChange={(value) => handleInputChange("level", value)}
          />
          <div className="relative species-dropdown">
            <ClearableInput
              value={filters.species}
              onChange={(newValue) => {
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
              onClear={() => {
                setFilter("species", "");
                handleInputChange("species", "");
                handleInputChange("subspecies", "");
                setFilter("subspecies", "");
                setIsSubspeciesDropdownOpen(false);
                setIsSpeciesDropdownOpen(false);
              }}
              placeholder="Species *"
              onFocus={() => setIsSpeciesDropdownOpen(true)}
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
              onKeyDown={handleSpeciesKeyDown}
            />
            {isSpeciesDropdownOpen && filteredSpecies.length > 0 && (
              <ul
                ref={speciesDropdownRef}
                className="absolute z-10 w-full mt-1 max-h-60 overflow-auto bg-base-200 rounded-lg shadow-lg"
              >
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
                    }}
                  >
                    {species}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="relative subspecies-dropdown">
            <ClearableInput
              value={filters.subspecies}
              onChange={(newValue) => {
                setFilter("subspecies", newValue);
                handleInputChange("subspecies", newValue);
                setIsSubspeciesDropdownOpen(true);
                setSubspeciesFocusedIndex(-1);
              }}
              onClear={() => {
                setFilter("subspecies", "");
                handleInputChange("subspecies", "");
                setIsSubspeciesDropdownOpen(false);
              }}
              placeholder={
                characterSubspecies[
                  character.species as keyof typeof characterSubspecies
                ]
                  ? "Subspecies *"
                  : "Subspecies"
              }
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
            {isSubspeciesDropdownOpen && availableSubspecies.length > 0 && (
              <ul
                ref={subspeciesDropdownRef}
                className="absolute z-10 w-full mt-1 max-h-60 overflow-auto bg-base-200 rounded-lg shadow-lg"
              >
                {availableSubspecies.map((subspecies, index) => (
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
            <ClearableInput
              value={filters.alignment}
              onChange={(newValue) => {
                setFilter("alignment", newValue);
                setIsAlignmentDropdownOpen(true);
                setAlignmentFocusedIndex(-1);
              }}
              onClear={() => {
                setFilter("alignment", "");
                handleInputChange("alignment", "");
                setIsAlignmentDropdownOpen(false);
              }}
              placeholder="Alignment *"
              onFocus={() => setIsAlignmentDropdownOpen(true)}
              onKeyDown={handleAlignmentKeyDown}
              onBlur={() => {
                if (!characterAlignments.includes(filters.alignment)) {
                  setFilter("alignment", "");
                  handleInputChange("alignment", "");
                }
              }}
            />
            {isAlignmentDropdownOpen && filteredAlignments.length > 0 && (
              <ul
                ref={alignmentDropdownRef}
                className="absolute z-10 w-full mt-1 max-h-60 overflow-auto bg-base-200 rounded-lg shadow-lg"
              >
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
            <ClearableInput
              value={filters.background}
              onChange={(newValue) => {
                setFilter("background", newValue);
                setIsBackgroundDropdownOpen(true);
                setBackgroundFocusedIndex(-1);
              }}
              onClear={() => {
                setFilter("background", "");
                handleInputChange("background", "");
                setIsBackgroundDropdownOpen(false);
              }}
              placeholder="Background *"
              onFocus={() => setIsBackgroundDropdownOpen(true)}
              onKeyDown={handleBackgroundKeyDown}
              onBlur={() => {
                if (!characterBackgrounds.includes(filters.background)) {
                  setFilter("background", "");
                  handleInputChange("background", "");
                }
              }}
            />
            {isBackgroundDropdownOpen && filteredBackgrounds.length > 0 && (
              <ul
                ref={backgroundDropdownRef}
                className="absolute z-10 w-full mt-1 max-h-60 overflow-auto bg-base-200 rounded-lg shadow-lg"
              >
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
            <ClearableInput
              value={filters.class}
              onChange={(newValue) => {
                setFilter("class", newValue);
                setIsClassDropdownOpen(true);
                setClassFocusedIndex(-1);
              }}
              onClear={() => {
                setFilter("class", "");
                setIsClassDropdownOpen(false);
              }}
              placeholder="Add Class (max 3) *"
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
              <ul
                ref={classDropdownRef}
                className="absolute z-10 w-full mt-1 max-h-60 overflow-auto bg-base-200 rounded-lg shadow-lg"
              >
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
                        const updatedClasses = [
                          ...character.classes,
                          className,
                        ];
                        handleInputChange("classes", updatedClasses);
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
            <ClearableInput
              value={filters.subclass}
              onChange={(newValue) => {
                setFilter("subclass", newValue);
                if (!newValue) {
                  handleInputChange("subClass", "");
                } else if (filteredSubclasses.includes(newValue)) {
                  handleInputChange("subClass", newValue);
                }
                setIsSubclassDropdownOpen(true);
                setSubclassFocusedIndex(-1);
              }}
              onClear={() => {
                setFilter("subclass", "");
                handleInputChange("subClass", "");
                setIsSubclassDropdownOpen(false);
              }}
              placeholder={
                (character.level ?? 1) < 3
                  ? "Reach level 3 to select a subclass"
                  : (character.level ?? 1) >= 3
                  ? "Add Subclass *"
                  : "Add Subclass"
              }
              onFocus={() => setIsSubclassDropdownOpen(true)}
              onBlur={(e) => {
                // Only close if the related target is not within the dropdown
                const relatedTarget = e.relatedTarget as HTMLElement;
                if (!relatedTarget?.closest(".subclass-dropdown")) {
                  setTimeout(() => {
                    setIsSubclassDropdownOpen(false);
                  }, 200);
                }
                if (!filteredSubclasses.includes(filters.subclass)) {
                  setFilter("subclass", "");
                  handleInputChange("subClass", "");
                }
              }}
              onKeyDown={handleSubclassKeyDown}
              disabled={
                (character.level ?? 1) < 3 || character.classes.length === 0
              }
            />
            {isSubclassDropdownOpen && filteredSubclasses.length > 0 && (
              <ul
                ref={subclassDropdownRef}
                className="absolute z-10 w-full mt-1 max-h-60 overflow-auto bg-base-200 rounded-lg shadow-lg"
              >
                {filteredSubclasses.map((subclass, index) => (
                  <li
                    key={subclass}
                    className={`px-4 py-2 cursor-pointer ${
                      index === subclassFocusedIndex
                        ? "bg-base-300"
                        : "hover:bg-base-300"
                    }`}
                    onClick={() => {
                      handleInputChange("subClass", subclass);
                      setFilter("subclass", subclass);
                      setIsSubclassDropdownOpen(false);
                      setSubclassFocusedIndex(-1);
                    }}
                  >
                    {subclass}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <h2 className="text-xl text-white font-bold col-span-full mt-6 mb-2">
            Special Abilities
          </h2>
          <div className="col-span-full">
            <div className="flex flex-wrap gap-2 mb-2">
              {(character.specialAbilities || []).map((ability) => (
                <span
                  key={ability}
                  className="badge badge-neutral-content gap-2"
                >
                  {ability}
                  <button
                    onClick={() => {
                      handleInputChange(
                        "specialAbilities",
                        character.specialAbilities.filter((a) => a !== ability)
                      );
                    }}
                    className="btn btn-xs btn-ghost"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add special ability"
                className="input input-bordered w-full"
                value={filters.specialAbility || ""}
                onChange={(e) => setFilter("specialAbility", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filters.specialAbility?.trim()) {
                    handleInputChange("specialAbilities", [
                      ...(character.specialAbilities || []),
                      filters.specialAbility.trim(),
                    ]);
                    setFilter("specialAbility", "");
                  }
                }}
              />
              <button
                className="btn btn-sm"
                onClick={() => {
                  if (filters.specialAbility?.trim()) {
                    handleInputChange("specialAbilities", [
                      ...(character.specialAbilities || []),
                      filters.specialAbility.trim(),
                    ]);
                    setFilter("specialAbility", "");
                  }
                }}
              >
                Add
              </button>
            </div>
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
                <div className="flex flex-col gap-2">
                  <NumberInput
                    value={String(
                      character.attributes?.[
                        stat as keyof typeof character.attributes
                      ]?.value ?? 1
                    )}
                    min={1}
                    max={30}
                    onChange={(value) => {
                      // Calculate bonus using D&D formula: (score - 10) / 2, rounded down
                      const bonus = Math.floor((value - 10) / 2);
                      handleInputChange("attributes", {
                        ...character.attributes,
                        [stat]: {
                          value: value,
                          bonus: bonus,
                        },
                      });
                    }}
                  />
                  <div className="flex items-center mt-1">
                    <span className="text-white text-sm mr-2">Bonus:</span>
                    <span className="text-white text-sm font-bold">
                      {character.attributes?.[
                        stat as keyof typeof character.attributes
                      ]?.bonus >= 0
                        ? "+"
                        : ""}
                      {character.attributes?.[
                        stat as keyof typeof character.attributes
                      ]?.bonus ?? Math.floor((1 - 10) / 2)}
                    </span>
                  </div>
                </div>
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
              <NumberInput
                value={String(character.money.platinum)}
                min={0}
                onChange={(value) =>
                  handleInputChange("money", {
                    ...character.money,
                    platinum: value,
                  })
                }
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text text-white">Gold</span>
              </label>
              <NumberInput
                value={String(character.money.gold)}
                min={0}
                onChange={(value) =>
                  handleInputChange("money", {
                    ...character.money,
                    gold: value,
                  })
                }
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text text-white">Electrum</span>
              </label>
              <NumberInput
                value={String(character.money.electrum)}
                min={0}
                onChange={(value) =>
                  handleInputChange("money", {
                    ...character.money,
                    electrum: value,
                  })
                }
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text text-white">Silver</span>
              </label>
              <NumberInput
                value={String(character.money.silver)}
                min={0}
                onChange={(value) =>
                  handleInputChange("money", {
                    ...character.money,
                    silver: value,
                  })
                }
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text text-white">Copper</span>
              </label>
              <NumberInput
                value={String(character.money.copper)}
                min={0}
                onChange={(value) =>
                  handleInputChange("money", {
                    ...character.money,
                    copper: value,
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
