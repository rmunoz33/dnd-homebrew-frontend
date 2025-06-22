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
      let formattedResult = "";

      // Handle multiple tool results
      if (toolResult.allResults && toolResult.allResults.length > 1) {
        formattedResult = "\n\n**Multiple Tool Results**:\n";
        toolResult.allResults.forEach((result, index) => {
          if (result.error) {
            formattedResult += `\n**${result.toolName}**: Error - ${result.error}\n`;
          } else if (result.result) {
            formattedResult += formatToolResult(result.toolName, result.result);
          }
        });
      } else {
        // Single tool result (backward compatibility)
        formattedResult = formatToolResult(
          toolResult.toolName!,
          toolResult.result
        );
      }

      return NextResponse.json({
        success: true,
        toolUsed: true,
        toolName: toolResult.toolName,
        result: toolResult.result,
        allResults: toolResult.allResults,
        formattedResult,
        message:
          toolResult.allResults && toolResult.allResults.length > 1
            ? `Successfully used ${toolResult.allResults.length} tools`
            : `Successfully used ${toolResult.toolName} tool`,
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
