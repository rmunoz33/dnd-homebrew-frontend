import { Tool, toolRegistry } from "./registry";
import { createDbLookupTool } from "@/lib/db/toolFactory";
import SubclassModel from "@/lib/db/models/subclass";

const getSubclassDetails: Tool = {
  name: "getSubclassDetails",
  description:
    "Get detailed information for D&D subclasses including features, abilities, and specializations. Use when players ask about class specializations, want to choose a subclass, or need subclass feature details.",
  parameters: [
    {
      name: "subclassName",
      type: "string",
      description:
        "Exact name of the subclass (e.g., 'Evocation', 'Thief', 'Life Domain', 'Champion')",
      required: true,
    },
  ],
  execute: createDbLookupTool(SubclassModel, "Subclass", "subclassName"),
};

toolRegistry.register(getSubclassDetails);

export { getSubclassDetails };
