"use client";

import { Character, useDnDStore } from "@/stores/useStore";
import { MedievalSharp } from "next/font/google";

const medievalFont = MedievalSharp({
  weight: "400",
  subsets: ["latin"],
});

const CharacterCreationPage = () => {
  const { character, setCharacter, setIsCharacterCreated } = useDnDStore();

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-800">
      <div className="flex flex-col items-center gap-8 w-full max-w-2xl p-8 bg-gray-800 mx-auto">
        <h1 className={`${medievalFont.className} text-6xl text-red-500 mb-8`}>
          Create Your Character
        </h1>

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
          <input
            type="text"
            placeholder="Species"
            className="input input-bordered w-full"
            value={character.species}
            onChange={(e) => handleInputChange("species", e.target.value)}
          />
          <input
            type="text"
            placeholder="Subspecies"
            className="input input-bordered w-full"
            value={character.subspecies}
            onChange={(e) => handleInputChange("subspecies", e.target.value)}
          />
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

          <button
            className="btn mt-8 col-span-full"
            disabled={!isCharacterDetailsComplete()}
            onClick={() => setIsCharacterCreated(true)}
          >
            Create Character
          </button>
        </div>
      </div>
    </div>
  );
};

export default CharacterCreationPage;
