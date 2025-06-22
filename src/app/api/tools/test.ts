import { toolRegistry } from "./index";

// Simple test function to verify tool registry setup
export async function testToolRegistry() {
  console.log("Testing Tool Registry...");

  // Check if tools are registered
  const tools = toolRegistry.getAllTools();
  console.log(`Registered tools: ${tools.length}`);

  tools.forEach((tool) => {
    console.log(`- ${tool.name}: ${tool.description}`);
  });

  // Test tool descriptions generation
  const descriptions = toolRegistry.generateToolDescriptions();
  console.log("\nTool descriptions:");
  console.log(descriptions);

  return {
    toolCount: tools.length,
    descriptions: descriptions,
  };
}
