import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { Character } from "@/stores/useStore";
import { buildCampaignPrompt } from "@/lib/campaignPrompt";

export const maxDuration = 30;

interface CampaignRequestBody {
  character: Character;
}

export async function POST(req: Request) {
  const { character }: CampaignRequestBody = await req.json();

  const prompt = buildCampaignPrompt(character);

  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system:
      "You are an expert D&D campaign designer who creates engaging, character-driven solo adventures.",
    prompt,
    temperature: 0.7,
    maxOutputTokens: 3000,
  });

  return result.toTextStreamResponse();
}
