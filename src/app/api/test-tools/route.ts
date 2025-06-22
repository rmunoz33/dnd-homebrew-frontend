import { NextResponse } from "next/server";
import { toolRegistry } from "../tools";

export async function GET() {
  try {
    // Get all registered tools
    const tools = toolRegistry.getAllTools();

    // Generate tool descriptions
    const descriptions = toolRegistry.generateToolDescriptions();

    // Test a simple tool execution (we'll test with a mock since we don't want to hit the API in a test)
    const testResult = {
      toolCount: tools.length,
      toolNames: tools.map((tool) => tool.name),
      descriptions: descriptions,
      registryWorking: true,
    };

    return NextResponse.json(testResult);
  } catch (error) {
    console.error("Error testing tool registry:", error);
    return NextResponse.json(
      { error: "Failed to test tool registry", details: error },
      { status: 500 }
    );
  }
}
