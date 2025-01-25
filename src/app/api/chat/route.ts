import { OpenAI } from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY!,
  dangerouslyAllowBrowser: true,
});

export async function POST(request: Request) {
  try {
    const { message, character } = await request.json();

    // Create a new ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        const completion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a world-class Dungeon Master in a D&D game. The player's character has the following details:
${JSON.stringify(character, null, 2)}

Respond in character as a DM, guiding the player through their adventure. Keep responses concise but engaging, and maintain the medieval fantasy atmosphere.
If the player asks about their character's stats or abilities, use the provided character details to inform your response.
If they want to perform an action, describe the outcome based on their character's abilities and the situation.
Balance world-building and story-telling with game mechanics.`,
            },
            {
              role: "user",
              content: message,
            },
          ],
          temperature: 0.7,
          stream: true,
        });

        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            // Encode and send each chunk
            controller.enqueue(new TextEncoder().encode(`${content}`));
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
