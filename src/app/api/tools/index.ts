// Client-safe tool imports only (no mongoose/DB dependency)
// For server-side code that needs DB tools, import from "./server" instead
import "./characterTools";

// Export the registry for use in client-side code
export { toolRegistry } from "./registry";
export type { Tool, ToolParameter } from "./registry";
