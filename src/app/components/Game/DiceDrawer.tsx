import { X } from "lucide-react";
import { MedievalSharp } from "next/font/google";
import { useState } from "react";

const medievalFont = MedievalSharp({
  weight: "400",
  subsets: ["latin"],
});

interface DiceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const diceTypes = [
  { name: "d4", sides: 4 },
  { name: "d6", sides: 6 },
  { name: "d8", sides: 8 },
  { name: "d10", sides: 10 },
  { name: "d12", sides: 12 },
  { name: "d20", sides: 20 },
  { name: "d100", sides: 100 },
];

const DiceDrawer = ({ isOpen, onClose }: DiceDrawerProps) => {
  const [result, setResult] = useState<null | { name: string; value: number }>(
    null
  );

  const rollDie = (name: string, sides: number) => {
    const value = Math.floor(Math.random() * sides) + 1;
    setResult({ name, value });
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
              Dice Roller
            </h1>
            <button
              className="btn btn-md btn-circle bg-red-500 hover:bg-red-600 text-white border-none shadow-md transition-all duration-200 hover:scale-110"
              onClick={onClose}
              aria-label="Close dice drawer"
            >
              <X size={22} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Dice Icons */}
        <div className="flex flex-wrap justify-center gap-4 p-6">
          {diceTypes.map((die) => (
            <button
              key={die.name}
              className="flex flex-col items-center focus:outline-none hover:scale-110 transition-transform"
              onClick={() => rollDie(die.name, die.sides)}
              aria-label={`Roll ${die.name}`}
            >
              <img
                src={`/img/dice_icons/${die.name}.png`}
                alt={die.name}
                width={48}
                height={48}
                className="mb-1"
              />
              <span className="text-xs text-neutral-content font-semibold uppercase">
                {die.name}
              </span>
            </button>
          ))}
        </div>

        {/* Result Display */}
        <div className="flex-1 p-4 text-neutral-content flex flex-col items-center justify-center">
          {result ? (
            <div className="mt-4 text-center">
              <div className="text-lg font-bold mb-2">{`You rolled a ${result.name}:`}</div>
              <div className="text-5xl text-red-500 font-extrabold drop-shadow-lg">
                {result.value}
              </div>
            </div>
          ) : (
            <div className="mt-4 text-center text-base-content/60">
              Click a die to roll!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiceDrawer;
