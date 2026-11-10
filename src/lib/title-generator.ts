/**
 * @file Generates short conversation titles from the first user message.
 * @module lib/title-generator
 */
import { builtInAI } from '@built-in-ai/core';
import { generateText } from 'ai';

const MAX_FALLBACK_LENGTH = 50;
const MAX_GENERATED_TITLE_LENGTH = 60;

/**
 * Builds a fallback title from the start of a message.
 * @param message - Source message text.
 * @returns Truncated, trimmed title.
 */
function buildFallbackTitle(message: string): string {
  return (
    message.slice(0, MAX_FALLBACK_LENGTH).trim() +
    (message.length > MAX_FALLBACK_LENGTH ? '...' : '')
  );
}

/**
 * Generates a concise title for a conversation based on the first user message.
 * Uses the browser's built-in AI model via @built-in-ai/core when available.
 * @param firstUserMessage - The first message in the conversation.
 * @returns A short descriptive title, or a truncated fallback.
 */
export async function generateConversationTitle(
  firstUserMessage: string
): Promise<string> {
  try {
    // Check if the Prompt API is available
    if (typeof window === 'undefined' || !('ai' in window)) {
      return buildFallbackTitle(firstUserMessage);
    }

    const result = await generateText({
      model: builtInAI(),
      prompt: `Generate a concise, descriptive title (maximum 6 words) for a conversation that starts with this message: "${firstUserMessage}"

The title should:
- Be clear and specific
- Capture the main topic or intent
- Be 6 words or less
- Not include quotes or special formatting
- Be in the same language as the message

Title:`,
    });

    const title = result.text.trim();

    if (!title || title.length > MAX_GENERATED_TITLE_LENGTH) {
      return buildFallbackTitle(firstUserMessage);
    }

    return title;
  } catch (error: unknown) {
    console.warn('[TitleGenerator] Failed to generate title:', error);
    return buildFallbackTitle(firstUserMessage);
  }
}
