import { Character } from "@/stores/useStore";

/** Build a concise character summary for prompts (avoids sending full JSON) */
function buildCharacterSummary(character: Character): string {
  const classes = character.classes.join("/");
  const subclass = character.subClass ? ` (${character.subClass})` : "";
  const backstorySnippet = character.backStory
    ? character.backStory.slice(0, 200) + (character.backStory.length > 200 ? "..." : "")
    : "No backstory provided";

  return `Name: ${character.name || "Unnamed"}
Level: ${character.level || 1}
Class: ${classes}${subclass}
Species: ${character.species}${character.subspecies ? ` (${character.subspecies})` : ""}
Background: ${character.background}
Alignment: ${character.alignment}
Backstory: ${backstorySnippet}`;
}

/**
 * Builds the campaign generation prompt for a character.
 * Used by both the streaming route handler and the server action fallback.
 */
export function buildCampaignPrompt(character: Character): string {
  const startingLevel = character.level || 1;
  const characterSummary = buildCharacterSummary(character);

  return `Create a solo D&D 5e campaign outline for this character:

${characterSummary}

Starting level: ${startingLevel}

Write 5 sections in markdown:

## 1. Campaign Overview
Plot hook, setting, tone, themes. 2-3 paragraphs.

## 2. Three-Act Structure
Narrative beats and decision points per act. Use placeholders like [ENCOUNTER: CR-appropriate undead patrol] instead of full stat blocks. Keep each act to 2-3 paragraphs.

## 3. Key NPCs
Name, role, motivation — 1-2 sentences each. Use placeholders like [STATS: use Bandit Captain template] instead of inline stat blocks. Include 3-5 NPCs.

## 4. The Antagonist
Backstory, motivation, goal. Use placeholder [BOSS STATS: base on CR X creature] instead of an inline stat block. 2-3 paragraphs.

## 5. Character Integration
How the character's background ties to the plot, personal stakes, opportunities for growth. 2-3 paragraphs.

Use the placeholder convention [TYPE: description] throughout — the DM has database access to look up actual stats during play.`;
}
