import { NextRequest, NextResponse } from "next/server";
import { executeToolsFromResponse, formatToolResult } from "../tools/executor";

export async function POST(request: NextRequest) {
  try {
    const { userInput, aiResponse } = await request.json();

    console.log("Testing tools with AI intent detection:");
    console.log("User Input:", userInput);
    console.log("AI Response:", aiResponse);

    // Execute tools based on AI response
    const toolResult = await executeToolsFromResponse(aiResponse, userInput);

    if (toolResult.toolUsed) {
      const formattedResult = formatToolResult(
        toolResult.toolName!,
        toolResult.result
      );

      return NextResponse.json({
        success: true,
        toolUsed: true,
        toolName: toolResult.toolName,
        result: toolResult.result,
        formattedResult,
        message: `Successfully used ${toolResult.toolName} tool`,
      });
    } else {
      return NextResponse.json({
        success: true,
        toolUsed: false,
        error: toolResult.error,
        message: "No tools were triggered for this input",
      });
    }
  } catch (error) {
    console.error("Error in test-tools:", error);
    return NextResponse.json(
      { success: false, error: `Test failed: ${error}` },
      { status: 500 }
    );
  }
}
