// Import all tools to register them with the tool registry
// Character state tools first (most important for gameplay)
import "./characterTools";
// D&D reference tools
import "./monsterTools";
import "./spellTools";
import "./equipmentTools";
import "./classTools";
import "./raceTools";
import "./conditionTools";
import "./skillTools";
import "./featTools";
import "./backgroundTools";
import "./subclassTools";
import "./magicItemTools";
import "./ruleTools";
import "./traitTools";
import "./languageTools";
import "./damageTypeTools";

// Export the registry for use in other parts of the application
export { toolRegistry } from "./registry";
export type { Tool, ToolParameter } from "./registry";
export { executeToolsFromResponse, formatToolResult } from "./executor";
