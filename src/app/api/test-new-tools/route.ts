import { NextRequest, NextResponse } from "next/server";
import { toolRegistry } from "../tools";

export async function POST(request: NextRequest) {
  try {
    const { toolName, args } = await request.json();

    console.log(`Testing tool: ${toolName} with args:`, args);

    if (!toolRegistry.hasTool(toolName)) {
      return NextResponse.json(
        {
          error: `Tool '${toolName}' not found`,
          availableTools: toolRegistry.getAllTools().map((t) => t.name),
        },
        { status: 404 }
      );
    }

    const result = await toolRegistry.executeTool(toolName, args || {});

    return NextResponse.json({
      success: true,
      toolName,
      args,
      result,
    });
  } catch (error) {
    console.error("Error testing tool:", error);
    return NextResponse.json(
      {
        error: "Failed to test tool",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const tools = toolRegistry.getAllTools();
  return NextResponse.json({
    availableTools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    })),
  });
}
