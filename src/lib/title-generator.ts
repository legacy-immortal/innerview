import { builtInAI } from '@built-in-ai/core';
import { generateText } from 'ai';

/**
 * Generates a concise title for a conversation based on the first user message
 * Uses the browser's built-in AI model via @built-in-ai/core
 */
export async function generateConversationTitle(
  firstUserMessage: string
): Promise<string> {
  try {
    // Check if the Prompt API is available
    if (typeof window === 'undefined' || !('ai' in window)) {
      // Fallback: use first 50 characters of the message
      return (
        firstUserMessage.slice(0, 50).trim() +
        (firstUserMessage.length > 50 ? '...' : '')
      );
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

    // Fallback if title is too long or empty
    if (!title || title.length > 60) {
      return (
        firstUserMessage.slice(0, 50).trim() +
        (firstUserMessage.length > 50 ? '...' : '')
      );
    }

    return title;
  } catch (error) {
    console.warn('[TitleGenerator] Failed to generate title:', error);
    // Fallback: use first 50 characters of the message
    return (
      firstUserMessage.slice(0, 50).trim() +
      (firstUserMessage.length > 50 ? '...' : '')
    );
  }
}
