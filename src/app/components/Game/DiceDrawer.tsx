import { X, Trash2, Minus, Plus } from "lucide-react";
import { MedievalSharp, EB_Garamond } from "next/font/google";
import { useState } from "react";
import { useDnDStore } from "@/stores/useStore";
import Image from "next/image";

const medievalFont = MedievalSharp({
  weight: "400",
  subsets: ["latin"],
});

const garamondFont = EB_Garamond({
  weight: ["700"],
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

type DicePool = { [key: string]: number };

type RollResult = {
  name: string;
  rolls: number[];
};

const DiceDrawer = ({ isOpen, onClose }: DiceDrawerProps) => {
  const [dicePool, setDicePool] = useState<DicePool>({});
  const [results, setResults] = useState<RollResult[] | null>(null);
  const setInputMessage = useDnDStore((state) => state.setInputMessage);
  const inputMessage = useDnDStore((state) => state.inputMessage);

  const addDie = (name: string) => {
    setDicePool((pool) => ({ ...pool, [name]: (pool[name] || 0) + 1 }));
  };

  const removeDie = (name: string) => {
    setDicePool((pool) => {
      if (!pool[name]) return pool;
      const updated = { ...pool, [name]: pool[name] - 1 };
      if (updated[name] <= 0) delete updated[name];
      return updated;
    });
  };

  const clearPool = () => {
    setDicePool({});
    setResults(null);
  };

  const rollAll = () => {
    const newResults: RollResult[] = [];
    Object.entries(dicePool).forEach(([name, count]) => {
      const sides = diceTypes.find((d) => d.name === name)?.sides || 0;
      const rolls = Array.from(
        { length: count },
        () => Math.floor(Math.random() * sides) + 1
      );
      newResults.push({ name, rolls });
    });
    setResults(newResults);
  };

  const total = results
    ? results.reduce((sum, r) => sum + r.rolls.reduce((a, b) => a + b, 0), 0)
    : 0;

  const formatResultsForChat = () => {
    if (!results) return "";
    return results
      .map(
        (r) =>
          `${r.rolls.length}x ${r.name}: ${r.rolls.join(
            ", "
          )} (total: ${r.rolls.reduce((a, b) => a + b, 0)})`
      )
      .join("; ");
  };

  const handleSendToChat = () => {
    const summary = formatResultsForChat();
    setInputMessage(inputMessage ? `${inputMessage} ${summary}` : summary);
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Dice Icons */}
          <div className="flex flex-wrap justify-center gap-4 p-6">
            {diceTypes.map((die) => (
              <button
                key={die.name}
                className="flex flex-col items-center focus:outline-none hover:scale-110 transition-transform"
                onClick={() => addDie(die.name)}
                aria-label={`Add ${die.name}`}
              >
                <Image
                  src={`/img/dice_icons/${die.name}.png`}
                  alt={die.name}
                  width={48}
                  height={48}
                  className="mb-1"
                />
                <span className="text-xs text-neutral-content font-semibold uppercase">
                  {die.name}
                </span>
                <Plus size={16} className="mt-1 text-green-500" />
              </button>
            ))}
          </div>

          {/* Dice Pool */}
          <div className="px-6 pb-2">
            <div className="flex flex-wrap gap-2 items-center min-h-[32px]">
              {Object.keys(dicePool).length === 0 ? (
                <span className="text-white">Add dice to your pool above.</span>
              ) : (
                diceTypes
                  .filter((die) => dicePool[die.name])
                  .map((die) => (
                    <div
                      key={die.name}
                      className="flex items-center bg-base-300 rounded px-2 py-1 gap-1 shadow"
                    >
                      <Image
                        src={`/img/dice_icons/${die.name}.png`}
                        alt={die.name}
                        width={24}
                        height={24}
                      />
                      <span className="font-bold text-sm text-black">
                        {dicePool[die.name]}x {die.name}
                      </span>
                      <button
                        className="btn btn-xs btn-circle btn-ghost text-red-500 hover:bg-red-200"
                        onClick={() => removeDie(die.name)}
                        aria-label={`Remove one ${die.name}`}
                      >
                        <Minus size={14} />
                      </button>
                    </div>
                  ))
              )}
              {Object.keys(dicePool).length > 0 && (
                <button
                  className="btn btn-xs btn-circle btn-ghost text-gray-400 hover:text-red-500 ml-2"
                  onClick={clearPool}
                  aria-label="Clear all dice"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Roll Button */}
          <div className="px-6 pb-2 flex justify-center">
            <button
              className={`btn w-full mt-2 bg-red-500 hover:bg-red-600 text-white border-none shadow-md transition-all duration-200 hover:scale-110 font-bold ${garamondFont.className}`}
              onClick={rollAll}
              disabled={Object.keys(dicePool).length === 0}
            >
              Roll Dice
            </button>
          </div>

          {/* Result Display */}
          <div className="flex-1 p-4 text-neutral-content flex flex-col items-center justify-center">
            {results ? (
              <div className="w-full max-w-xs mt-4 text-center">
                <div className="text-lg font-bold mb-2">Results:</div>
                {results.map((r) => (
                  <div key={r.name} className="mb-2">
                    <span className="font-semibold uppercase">{r.name}:</span>
                    <span className="ml-2">{r.rolls.join(", ")}</span>
                    <span className="ml-2 text-sm text-gray-400">
                      (total: {r.rolls.reduce((a, b) => a + b, 0)})
                    </span>
                  </div>
                ))}
                <div className="mt-2 text-xl text-red-500 font-extrabold drop-shadow-lg">
                  Total: {total}
                </div>
                {results && results.length > 0 && (
                  <button
                    className={`btn w-full mt-4 bg-gray-700 hover:bg-gray-600 text-white border-none shadow-md transition-all duration-200 hover:scale-105 font-bold ${garamondFont.className}`}
                    onClick={handleSendToChat}
                  >
                    Send to Chat
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-4 text-center text-gray-400">
                {`Add dice and click "Roll Dice"!`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiceDrawer;
