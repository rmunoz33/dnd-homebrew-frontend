import { NextRequest, NextResponse } from "next/server";
import { executeToolsFromResponse } from "../tools/executor";
import { toolRegistry } from "../tools";

export async function POST(request: NextRequest) {
  try {
    const { userInput } = await request.json();

    console.log("Testing tools with AI intent detection:");
    console.log("User Input:", userInput);

    // Create a comprehensive prompt for the LLM
    const prompt = `You are a helpful D&D assistant. The user has asked: "${userInput}"

Available tools:
${toolRegistry
  .getAllTools()
  .map((tool) => {
    return `- ${tool.name}: ${tool.description}
  Parameters: ${tool.parameters
    .map((p) => `${p.name} (${p.type})${p.required ? " - required" : ""}`)
    .join(", ")}`;
  })
  .join("\n")}

Based on the user's request, determine which tool(s) to use and extract the necessary parameters. Return a JSON object with either:
- A single tool: {"tool": "toolName", "args": {"paramName": "value"}}
- Multiple tools: {"tools": [{"tool": "toolName", "args": {"paramName": "value"}}, ...]}
- No tools needed: {"tools": []}

For equipment, use exact item names like "Longsword", "Plate Armor", "Potion of Healing".
For classes, use exact class names like "Fighter", "Wizard", "Cleric".
For races, use exact race names like "Human", "Elf", "Dwarf".
For monsters, use exact monster names like "Goblin", "Adult Red Dragon".
For spells, use exact spell names like "Fireball", "Cure Wounds".
For conditions, use exact condition names like "Poisoned", "Paralyzed", "Invisible".
For skills, use exact skill names like "Acrobatics", "Stealth", "Persuasion".
For feats, use exact feat names like "Alert", "Lucky", "Sharpshooter".
For backgrounds, use exact background names like "Acolyte", "Criminal", "Folk Hero".
For subclasses, use exact subclass names like "Evocation", "Thief", "Life Domain".
For magic items, use exact item names like "Sword of Sharpness", "Ring of Protection".
For rules, use exact rule names like "Combat", "Ability Scores", "Saving Throws".
For traits, use exact trait names like "Darkvision", "Fey Ancestry", "Second Wind".
For languages, use exact language names like "Common", "Elvish", "Draconic".
For damage types, use exact damage type names like "Slashing", "Fire", "Cold".

Examples:
- "I want to buy a sword" → {"tool": "getEquipmentDetails", "args": {"itemName": "Longsword"}}
- "Tell me about wizards" → {"tool": "getClassDetails", "args": {"className": "Wizard"}}
- "What can elves do?" → {"tool": "getRaceDetails", "args": {"raceName": "Elf"}}
- "I need healing" → {"tool": "getSpellDetails", "args": {"spellName": "Cure Wounds"}}
- "What's a goblin?" → {"tool": "getMonsterStats", "args": {"monsterName": "Goblin"}}
- "What does poisoned do?" → {"tool": "getConditionDetails", "args": {"conditionName": "Poisoned"}}
- "How does stealth work?" → {"tool": "getSkillDetails", "args": {"skillName": "Stealth"}}
- "Tell me about the Lucky feat" → {"tool": "getFeatDetails", "args": {"featName": "Lucky"}}
- "What's the Acolyte background?" → {"tool": "getBackgroundDetails", "args": {"backgroundName": "Acolyte"}}
- "Tell me about Evocation wizards" → {"tool": "getSubclassDetails", "args": {"subclassName": "Evocation"}}
- "What's a Ring of Protection?" → {"tool": "getMagicItemDetails", "args": {"itemName": "Ring of Protection"}}
- "How does combat work?" → {"tool": "getRuleDetails", "args": {"ruleName": "Combat"}}
- "What is Darkvision?" → {"tool": "getTraitDetails", "args": {"traitName": "Darkvision"}}
- "Tell me about Elvish" → {"tool": "getLanguageDetails", "args": {"languageName": "Elvish"}}
- "What is fire damage?" → {"tool": "getDamageTypeDetails", "args": {"damageTypeName": "Fire"}}
- "I want armor and a weapon" → {"tools": [{"tool": "getEquipmentDetails", "args": {"itemName": "Plate Armor"}}, {"tool": "getEquipmentDetails", "args": {"itemName": "Longsword"}}]}

Respond with only the JSON object:`;

    // Call OpenAI to determine which tools to use
    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant that determines which D&D tools to use based on user requests. Respond with only valid JSON.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.1,
          max_tokens: 500,
        }),
      }
    );

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const llmResponse = openaiData.choices[0]?.message?.content?.trim();

    console.log("Raw LLM tool selection response:", llmResponse);

    // Execute the tools based on LLM response
    const result = await executeToolsFromResponse(llmResponse, userInput);

    return NextResponse.json({
      success: true,
      userInput,
      toolUsed: result.toolUsed,
      toolName: result.toolName,
      result: result.result,
      allResults: result.allResults,
      error: result.error,
      rawLlmResponse: llmResponse,
    });
  } catch (error) {
    console.error("Error in test-tools:", error);
    return NextResponse.json(
      {
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Use POST method with userInput in the request body" },
    { status: 405 }
  );
}
