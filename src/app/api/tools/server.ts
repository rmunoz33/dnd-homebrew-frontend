// Server-side tool initialization - registers ALL tools including DB-backed tools
// Only import this file in server-only contexts (server actions, route handlers)

// Client-safe tools
import "./characterTools";
// D&D reference tools (require mongoose - server only)
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
// 2024 edition tools
import "./background2024Tools";
import "./feat2024Tools";
import "./proficiency2024Tools";

// Export the registry for use in server-side code
export { toolRegistry } from "./registry";
export type { Tool, ToolParameter } from "./registry";
