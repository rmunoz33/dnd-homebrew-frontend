import { useState } from "react";
import { Character } from "@/stores/useStore";

type EquipmentCategory = keyof Character["equipment"];
type OnAddFn = (
  category: EquipmentCategory,
  value: string,
  setInput: (value: string) => void
) => void;
type OnRemoveFn = (category: EquipmentCategory, item: string) => void;

const EquipmentInput = ({
  category,
  placeholder,
  onAdd,
}: {
  category: EquipmentCategory;
  placeholder: string;
  onAdd: OnAddFn;
}) => {
  const [inputValue, setInputValue] = useState("");

  const handleAdd = () => {
    if (inputValue.trim()) {
      onAdd(category, inputValue.trim(), setInputValue);
    }
  };

  return (
    <div className="flex">
      <input
        type="text"
        placeholder={placeholder}
        className="input input-bordered w-full bg-base-200/50 border-primary/15 text-base-content placeholder:text-base-content/30 focus:border-primary/40 focus:outline-none"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
      />
      <button
        onClick={handleAdd}
        className="btn btn-ghost text-primary/60 hover:text-primary ml-2"
      >
        Add
      </button>
    </div>
  );
};

const EquipmentCategorySection = ({
  title,
  items,
  category,
  onRemove,
  onAdd,
}: {
  title: string;
  items: string[];
  category: EquipmentCategory;
  onRemove: OnRemoveFn;
  onAdd: OnAddFn;
}) => {
  return (
    <div className="col-span-1">
      <h3 className="text-base-content/60 mb-2">{title}</h3>
      <div className="flex flex-wrap gap-2 mb-2 min-h-[40px]">
        {items.map((item, index) => (
          <span
            key={`${category}-${item}-${index}`}
            className="badge bg-primary/10 border border-primary/20 text-base-content gap-2"
          >
            {item}
            <button
              onClick={() => onRemove(category, item)}
              className="btn btn-xs btn-ghost text-primary/40 hover:text-primary"
            >
              &times;
            </button>
          </span>
        ))}
      </div>
      <EquipmentInput
        category={category}
        placeholder={`Add ${title.slice(0, -1).toLowerCase()}`}
        onAdd={onAdd}
      />
    </div>
  );
};

export { EquipmentCategorySection };
