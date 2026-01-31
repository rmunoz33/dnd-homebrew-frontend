"use client";

import { Character, useDnDStore, initialCharacter } from "@/stores/useStore";
import { medievalFont } from "@/app/components/medievalFont";
import {
  generateCharacterDetails,
  generateCampaignOutline,
} from "@/app/api/openai";
import { useState, useEffect } from "react";
import {
  useCharacterOptions,
  useSubspecies,
  useSubclassesForClass,
} from "@/hooks/useCharacterOptions";
import React, { useRef } from "react";
import { NumberInput } from "./NumberInput";
import { ClearableInput } from "./ClearableInput";
import { EquipmentCategorySection } from "./EquipmentSection";
import { ResetWarningModal } from "./ResetWarningModal";
import { SectionHeader } from "./SectionHeader";

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
    campaignOutline,
    setCampaignOutline,
  } = useDnDStore();

  // Fetch character options from API
  const {
    races,
    classes,
    alignments,
    backgrounds,
    loading: optionsLoading,
  } = useCharacterOptions();
  const { data: availableSubspecies } = useSubspecies(character.species);
  // Lazy load subclasses only when classes are selected
  const { data: subclasses, loading: subclassesLoading } =
    useSubclassesForClass(character.classes);

  const [isRolling, setIsRolling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [specialAbilityInput, setSpecialAbilityInput] = useState("");
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

  const filteredSpecies = races.filter((species) =>
    species.toLowerCase().includes(filters.species.toLowerCase())
  );

  const filteredSubspecies = availableSubspecies.filter((subspecies) =>
    subspecies.toLowerCase().includes(filters.subspecies.toLowerCase())
  );

  const filteredAlignments = alignments.filter((alignment) =>
    alignment.toLowerCase().includes(filters.alignment.toLowerCase())
  );

  const filteredBackgrounds = backgrounds.filter((background) =>
    background.toLowerCase().includes(filters.background.toLowerCase())
  );

  const filteredClasses = classes.filter(
    (className) =>
      className.toLowerCase().includes(filters.class.toLowerCase()) &&
      !character.classes.includes(className)
  );

  const filteredSubclasses =
    character.classes.length > 0
      ? character.classes.flatMap((className) =>
          (subclasses[className] || []).filter((subclass) =>
            subclass.toLowerCase().includes(filters.subclass.toLowerCase())
          )
        )
      : [];

  // When species changes, reset subspecies if needed
  useEffect(() => {
    // Always clear subspecies when species changes, then let the hook repopulate if needed
    if (character.subspecies && availableSubspecies.length === 0) {
      handleInputChange("subspecies", "");
      setFilter("subspecies", "");
    }
    // Also check if current subspecies is valid for the new species
    else if (
      character.subspecies &&
      availableSubspecies.length > 0 &&
      !availableSubspecies.includes(character.subspecies)
    ) {
      handleInputChange("subspecies", "");
      setFilter("subspecies", "");
    }
    setIsSubspeciesDropdownOpen(false);
    setSubspeciesFocusedIndex(-1);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.species, availableSubspecies.length, availableSubspecies]);

  // Ensure specialAbilities is always initialized
  useEffect(() => {
    if (!character.specialAbilities) {
      handleInputChange("specialAbilities", []);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character]);

  const handleInputChange = (
    field: keyof Character,
    value: Character[keyof Character]
  ) => {
    const newCharacter = { ...character, [field]: value };
    setCharacter(newCharacter);
  };

  const isCharacterDetailsComplete = () => {
    const hasRequiredSubspecies =
      availableSubspecies.length === 0 || character.subspecies.trim() !== "";

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

    // Reset campaign outline
    setCampaignOutline("");
    // Otherwise proceed with character generation
    await generateRandomCharacter();
  };

  const generateRandomCharacter = async () => {
    setIsRolling(true);
    try {
      const suggestions = await generateCharacterDetails(character);
      const parsedSuggestions = suggestions as Character;

      // Ensure specialAbilities is initialized if missing from AI response
      if (!parsedSuggestions.specialAbilities) {
        parsedSuggestions.specialAbilities = [];
      }

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
    clearMessages();
    setShowResetWarning(false);
    setCampaignOutline("");
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

  const handleAlignmentKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
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
            handleInputChange("classes", [
              ...character.classes,
              selectedClass,
            ]);
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
    setCharacter({
      ...character,
      classes: character.classes.filter((c) => c !== classToRemove),
      subClass: "",
    });
    setFilter("subclass", "");
  };

  const handleSubclassKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
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
    setSpecialAbilityInput("");
  };

  const loadingMessages = [
    "Consulting the ancient tomes...",
    "Rolling for plot twists...",
    "Negotiating with goblin union reps...",
    "Summoning the campaign spirits...",
    "Bribing the DM with snacks...",
    "Untangling the plot threads...",
    "Polishing the dragon's scales...",
    "Casting 'Outlineus Campaignus'...",
    "Checking for traps in the story...",
    "Convincing the NPCs to behave...",
    "Sharpening the plot hooks...",
    "Feeding the random encounter generator...",
    "Making sure the villain has a monologue ready...",
    "Rolling a natural 20 on creativity...",
    "Herding plot bunnies...",
  ];
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);

  const handleSaveCharacter = async () => {
    if (!isCharacterDetailsComplete()) return;
    setIsSaving(true);
    setLoadingMessage(
      loadingMessages[Math.floor(Math.random() * loadingMessages.length)]
    );
    try {
      if (!campaignOutline) {
        const outline = await generateCampaignOutline(character);
        setCampaignOutline(outline ?? "");
      }
      setIsCharacterCreated(true);
    } catch (error) {
      console.error("Error saving character:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const inputClassName =
    "input input-bordered w-full bg-base-200/50 border-primary/15 text-base-content placeholder:text-base-content/30 focus:border-primary/40 focus:outline-none";

  return (
    <div className="flex min-h-screen items-center justify-center bg-login-vignette px-4 py-8">
      <ResetWarningModal
        isOpen={showResetWarning}
        onCancel={() => setShowResetWarning(false)}
        onConfirm={handleConfirmReset}
      />

      <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center gap-4">
          <h1
            className={`${medievalFont.className} text-3xl sm:text-4xl md:text-5xl text-primary text-glow-gold text-center`}
          >
            Create Your Character
          </h1>

          <div className="flex items-center gap-3 text-primary/20">
            <span className="block w-12 h-px bg-current" />
            <span className="text-xs">&#x2756;</span>
            <span className="block w-12 h-px bg-current" />
          </div>

          {optionsLoading && (
            <div className="text-center text-base-content mb-2">
              <div className="flex items-center gap-2 justify-center">
                <span className="animate-spin text-2xl">🎲</span>
                <span>Loading character options...</span>
              </div>
            </div>
          )}
          <div className="text-center text-base-content/70 mb-2 max-w-lg">
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
              className="btn btn-outline border-primary/30 text-base-content/80 hover:bg-primary/10 hover:border-primary/50 btn-sm"
              onClick={handleAISuggestions}
              disabled={isRolling}
            >
              {isRolling ? (
                <span className="animate-spin text-2xl">🎲</span>
              ) : (
                "Roll Me a Character"
              )}
            </button>
            {isCharacterModified() && (
              <button
                className="btn btn-ghost text-base-content/50 btn-sm"
                onClick={handleReset}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-base-200/30 border border-primary/10 rounded-xl p-6 md:p-8 w-full max-w-xl backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            <SectionHeader title="Character Details" />
            <input
              type="text"
              placeholder="Name *"
              className={inputClassName}
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
                  } else if (races.includes(newValue)) {
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
                  if (!races.includes(filters.species)) {
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
                  availableSubspecies.length > 0
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
                  !character.species || availableSubspecies.length === 0
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
                  if (!alignments.includes(filters.alignment)) {
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
                  if (!backgrounds.includes(filters.background)) {
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
                className="textarea textarea-bordered w-full h-32 bg-base-200/50 border-primary/15 text-base-content placeholder:text-base-content/30 focus:border-primary/40 focus:outline-none"
                value={character.backStory}
                onChange={(e) =>
                  handleInputChange("backStory", e.target.value)
                }
              />
            </div>

            <SectionHeader title="Classes" />
            <div className="relative class-dropdown">
              <div className="flex flex-wrap gap-2 mb-2">
                {character.classes.map((className) => (
                  <span
                    key={className}
                    className="badge bg-primary/10 border border-primary/20 text-base-content gap-2"
                  >
                    {className}
                    <button
                      onClick={() => removeClass(className)}
                      className="btn btn-xs btn-ghost text-primary/40 hover:text-primary"
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
                    : subclassesLoading
                      ? "Loading subclasses..."
                      : (character.level ?? 1) >= 3
                        ? "Add Subclass *"
                        : "Add Subclass"
                }
                onFocus={() => setIsSubclassDropdownOpen(true)}
                onBlur={(e) => {
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
                  (character.level ?? 1) < 3 ||
                  character.classes.length === 0 ||
                  subclassesLoading
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

            <SectionHeader title="Special Abilities" />
            <div className="col-span-full">
              <div className="flex flex-wrap gap-2 mb-2">
                {(character.specialAbilities || []).map((ability) => (
                  <span
                    key={ability}
                    className="badge bg-primary/10 border border-primary/20 text-base-content gap-2"
                  >
                    {ability}
                    <button
                      onClick={() => {
                        handleInputChange(
                          "specialAbilities",
                          character.specialAbilities.filter(
                            (a) => a !== ability
                          )
                        );
                      }}
                      className="btn btn-xs btn-ghost text-primary/40 hover:text-primary"
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
                  className={inputClassName}
                  value={specialAbilityInput}
                  onChange={(e) => setSpecialAbilityInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && specialAbilityInput?.trim()) {
                      handleInputChange("specialAbilities", [
                        ...(character.specialAbilities || []),
                        specialAbilityInput.trim(),
                      ]);
                      setSpecialAbilityInput("");
                    }
                  }}
                />
                <button
                  className="btn btn-ghost text-primary/60 hover:text-primary btn-sm"
                  onClick={() => {
                    if (specialAbilityInput?.trim()) {
                      handleInputChange("specialAbilities", [
                        ...(character.specialAbilities || []),
                        specialAbilityInput.trim(),
                      ]);
                      setSpecialAbilityInput("");
                    }
                  }}
                >
                  Add
                </button>
              </div>
            </div>

            <SectionHeader title="Equipment" />
            <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4">
              <EquipmentCategorySection
                title="Weapons"
                items={character.equipment?.weapons || []}
                category="weapons"
                onRemove={removeEquipment}
                onAdd={addEquipment}
              />
              <EquipmentCategorySection
                title="Armor"
                items={character.equipment?.armor || []}
                category="armor"
                onRemove={removeEquipment}
                onAdd={addEquipment}
              />
              <EquipmentCategorySection
                title="Tools"
                items={character.equipment?.tools || []}
                category="tools"
                onRemove={removeEquipment}
                onAdd={addEquipment}
              />
              <EquipmentCategorySection
                title="Magic Items"
                items={character.equipment?.magicItems || []}
                category="magicItems"
                onRemove={removeEquipment}
                onAdd={addEquipment}
              />
              <div className="md:col-span-2">
                <EquipmentCategorySection
                  title="Other Items"
                  items={character.equipment?.items || []}
                  category="items"
                  onRemove={removeEquipment}
                  onAdd={addEquipment}
                />
              </div>
            </div>

            <SectionHeader title="Attributes" />
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
                <div
                  key={stat}
                  className="form-control bg-base-200/30 rounded-lg p-3 border border-primary/5"
                >
                  <label className="label">
                    <span className="label-text text-base-content/70 capitalize">
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
                      <span className="text-base-content/60 text-sm mr-2">
                        Bonus:
                      </span>
                      <span className="text-primary text-sm font-bold">
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

            <SectionHeader title="Currency" />
            <div className="col-span-full grid grid-cols-3 md:grid-cols-5 gap-4">
              {(
                [
                  "platinum",
                  "gold",
                  "electrum",
                  "silver",
                  "copper",
                ] as const
              ).map((currency) => (
                <div
                  key={currency}
                  className="form-control bg-base-200/30 rounded-lg p-3 border border-primary/5"
                >
                  <label className="label">
                    <span className="label-text text-base-content/70 capitalize">
                      {currency}
                    </span>
                  </label>
                  <NumberInput
                    value={String(character.money[currency])}
                    min={0}
                    onChange={(value) =>
                      handleInputChange("money", {
                        ...character.money,
                        [currency]: value,
                      })
                    }
                  />
                </div>
              ))}
            </div>

            <div className="col-span-full mt-2 text-sm text-base-content/50">
              * Required fields
            </div>
            <div className="col-span-full">
              <button
                className="btn btn-outline btn-lg w-full border-primary/30 text-base-content/80 hover:bg-primary/10 hover:border-primary/50 uppercase tracking-widest font-bold mt-4"
                disabled={!isCharacterDetailsComplete() || isSaving}
                onClick={handleSaveCharacter}
              >
                {isSaving ? (
                  <span className="flex items-center gap-2 text-base-content font-bold">
                    <span className="animate-spin text-2xl">🎲</span>
                    {loadingMessage}
                  </span>
                ) : (
                  "Save Character"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterCreationPage;
