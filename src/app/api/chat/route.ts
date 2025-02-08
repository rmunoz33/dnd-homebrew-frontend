import { OpenAI } from "openai";
import { NextResponse } from "next/server";
import { Character, Message } from "@/stores/useStore";

const client = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY!,
  dangerouslyAllowBrowser: true,
});

export async function POST(request: Request) {
  try {
    const { message, character, messages } = await request.json();

    // Create a new ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        // Convert previous messages to OpenAI format
        const previousMessages = messages.map((msg: Message) => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.content,
        }));

        const completion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a world-class Dungeon Master in a D&D game. The player's character has the following details:
${JSON.stringify(character, null, 2)}

Respond in character as a DM, guiding the player through their adventure. Keep responses concise but engaging, and maintain the medieval fantasy atmosphere. Balance world-building, story-telling, and combat and game mechanics.

If the player asks about their character's stats or abilities, use the provided character details to inform your response.
If they want to perform an action, describe the outcome based on their character's abilities and the situation.

IMPORTANT: If any of the character's stats, equipment, or other attributes change during the interaction (e.g., taking damage, gaining items, using equipment),
you must provide a JSON object of the updated character state. Format your response like this:

---CHARACTER_UPDATE_START---
{
  // only include fields that changed
  "hitPoints": 15,
  "equipment": {
    "items": ["Rope", "Torch"]
  }
}
---CHARACTER_UPDATE_END---

Your regular response text here...`,
            },
            ...previousMessages,
            {
              role: "user",
              content: message,
            },
          ],
          temperature: 0.7,
          stream: true,
        });

        let isCharacterUpdate = false;
        let characterUpdate = "";

        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            if (content.includes("---CHARACTER_UPDATE_START---")) {
              isCharacterUpdate = true;
              continue;
            }
            if (content.includes("---CHARACTER_UPDATE_END---")) {
              isCharacterUpdate = false;
              try {
                const updateJson = JSON.parse(characterUpdate);
                const update = {
                  type: "character_update",
                  content: updateJson,
                };
                controller.enqueue(
                  new TextEncoder().encode(
                    `\n---UPDATE---\n${JSON.stringify(
                      update
                    )}\n---END_UPDATE---\n`
                  )
                );
              } catch (e) {
                console.error("Failed to parse character update:", e);
              }
              characterUpdate = "";
              continue;
            }

            if (isCharacterUpdate) {
              characterUpdate += content;
            } else {
              controller.enqueue(new TextEncoder().encode(content));
            }
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in chat route:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}
