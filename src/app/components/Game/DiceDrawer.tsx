import { X } from "lucide-react";
import { MedievalSharp } from "next/font/google";

const medievalFont = MedievalSharp({
  weight: "400",
  subsets: ["latin"],
});

interface DiceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const DiceDrawer = ({ isOpen, onClose }: DiceDrawerProps) => {
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
        <div className="flex-1 p-4 text-neutral-content">
          <p>Dice roller coming soon...</p>
        </div>
      </div>
    </div>
  );
};

export default DiceDrawer;
