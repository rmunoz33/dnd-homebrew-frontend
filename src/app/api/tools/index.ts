// Import all tools to register them with the tool registry
import "./monsterTools";

// Export the registry for use in other parts of the application
export { toolRegistry } from "./registry";
export type { Tool, ToolParameter } from "./registry";
