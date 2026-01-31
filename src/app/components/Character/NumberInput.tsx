import React from "react";

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
  className = "input input-bordered w-full bg-base-200/50 border-primary/15 text-base-content placeholder:text-base-content/30 focus:border-primary/40 focus:outline-none",
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
          className="text-primary/40 hover:text-primary/70 focus:outline-none"
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
          className="text-primary/40 hover:text-primary/70 focus:outline-none"
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

export { NumberInput };
export type { NumberInputProps };
