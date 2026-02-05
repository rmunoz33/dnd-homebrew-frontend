import { NextResponse } from "next/server";
import { executeToolsFromResponse, formatToolResult } from "../tools/executor";

export async function POST(request: Request) {
  try {
    const { userInput, aiResponse } = await request.json();
    // Test tool execution for spell
    const toolResult = await executeToolsFromResponse(aiResponse, userInput);
    if (toolResult.toolUsed && toolResult.result && toolResult.toolName) {
      const formattedResult = formatToolResult(
        toolResult.toolName,
        toolResult.result
      );
      return NextResponse.json({
        success: true,
        toolUsed: true,
        toolName: toolResult.toolName,
        result: toolResult.result,
        formattedResult: formattedResult,
      });
    } else if (toolResult.toolUsed && toolResult.error) {
      return NextResponse.json({
        success: false,
        toolUsed: true,
        error: toolResult.error,
      });
    } else {
      return NextResponse.json({
        success: true,
        toolUsed: false,
        message: "No tools were needed for this input",
      });
    }
  } catch (error) {
    console.error("Error testing spell tool:", error);
    return NextResponse.json(
      { error: "Failed to test spell tool", details: error },
      { status: 500 }
    );
  }
}
