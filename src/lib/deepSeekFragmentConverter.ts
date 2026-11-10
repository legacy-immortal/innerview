/**
 * @file Conversion of DeepSeek message fragments into Interlocutor messages.
 * @module lib/deepSeekFragmentConverter.ts
 */
// Convert DeepSeek message fragments into Interlocutor messages (extracted from conversation-importer.ts).
import type {
  DeepSeekFragment,
  DeepSeekMessage,
  InterlocutorMessage,
} from './conversation-import-types';
import {
  convertFileToPart,
  extractCitations,
  generateDeterministicMessageId,
} from './conversation-import-utils';
/**
 * Convert DeepSeek message fragments into Interlocutor messages.
 *
 * Groups REASONING/RESPONSE fragments into assistant messages flushed on
 * REQUEST fragments, and attaches files, citations, tool calls, and search
 * results collected from structured fragments. Each message gets a
 * deterministic id via {@link generateDeterministicMessageId}.
 * @param fragments - Fragments of a single DeepSeek message.
 * @param message - The parent DeepSeek message (files, inserted_at).
 * @param messageIndexRef - Mutable counter for unique message ids.
 * @returns Converted Interlocutor messages.
 * @see {@link generateDeterministicMessageId}
 * @see {@link extractCitations}
 * @see {@link convertFileToPart}
 */
export function convertFragmentsToMessages(
  fragments: DeepSeekFragment[],
  message: DeepSeekMessage,
  messageIndexRef: { current: number }
): InterlocutorMessage[] {
  const result: InterlocutorMessage[] = [];
  let currentAssistantReasoning: string[] = [];
  let currentAssistantContent = '';
  const messageFiles = message.files || [];
  // Collect structured data from fragments
  const searchResults: Array<{
    title?: string;
    url?: string;
    snippet?: string;
  }> = [];
  const toolCalls: Array<{
    toolCallId?: string;
    toolName?: string;
    toolInput?: unknown;
    toolOutput?: unknown;
  }> = [];

  for (const fragment of fragments) {
    if (fragment.type === 'SEARCH' && fragment.results) {
      // Extract search results directly from JSON structure
      for (const result of fragment.results) {
        searchResults.push({
          title: result.title,
          url: result.url,
          snippet: result.snippet,
        });
      }
    } else if (fragment.type === 'TOOL' || fragment.tool) {
      // Extract tool calls directly from JSON structure
      toolCalls.push({
        toolCallId: fragment.tool_call_id,
        toolName: fragment.tool,
        toolInput: fragment.input,
        toolOutput: fragment.output,
      });
    } else if (fragment.type === 'REQUEST') {
      // Flush pending assistant message
      if (
        currentAssistantContent.trim() ||
        currentAssistantReasoning.length > 0
      ) {
        const parts: InterlocutorMessage['parts'] = [];
        for (const reasoning of currentAssistantReasoning) {
          parts.push({
            type: 'reasoning',
            text: reasoning,
            state: 'done',
          } as InterlocutorMessage['parts'][number]);
        }
        if (currentAssistantContent.trim()) {
          const textContent = currentAssistantContent.trim();
          // Extract citations from text (these may still be in the text content)
          const citations = extractCitations(textContent);

          const textPart: InterlocutorMessage['parts'][number] = {
            type: 'text',
            text: textContent,
          };

          // Add citations if found
          if (citations.length > 0) {
            textPart.citations = citations;
          }

          // Add tool calls if found (from structured fragments)
          if (toolCalls.length > 0) {
            // For now, add the first tool call to the text part
            // In the future, we might want separate tool parts
            const firstToolCall = toolCalls[0];
            textPart.toolCallId = firstToolCall.toolCallId;
            textPart.toolName = firstToolCall.toolName;
            textPart.toolInput = firstToolCall.toolInput;
            textPart.toolOutput = firstToolCall.toolOutput;
          }

          // Add search results if found (from structured fragments)
          if (searchResults.length > 0) {
            textPart.searchResults = searchResults;
          }

          parts.push(textPart);
        }
        if (parts.length > 0) {
          // Extract text content for deterministic ID generation
          const textContent = parts
            .filter((part) => part.type === 'text' && part.text)
            .map((part) => part.text)
            .join(' ');
          result.push({
            id: generateDeterministicMessageId(
              textContent,
              'assistant',
              message.inserted_at,
              messageIndexRef.current++
            ),
            role: 'assistant',
            createdAt: message.inserted_at,
            parts,
          });
        }
        currentAssistantReasoning = [];
        currentAssistantContent = '';
        // Reset structured data for next message
        searchResults.length = 0;
        toolCalls.length = 0;
      }

      // User message with files
      const userParts: InterlocutorMessage['parts'] = [];
      for (const file of messageFiles) {
        userParts.push(
          convertFileToPart(file) as InterlocutorMessage['parts'][number]
        );
      }
      if (fragment.content) {
        userParts.push({
          type: 'text',
          text: fragment.content,
        } as InterlocutorMessage['parts'][number]);
      }

      // Extract text content for deterministic ID generation
      const userTextContent = userParts
        .filter((part) => part.type === 'text' && part.text)
        .map((part) => part.text)
        .join(' ');
      result.push({
        id: generateDeterministicMessageId(
          userTextContent,
          'user',
          message.inserted_at,
          messageIndexRef.current++
        ),
        role: 'user',
        createdAt: message.inserted_at,
        parts: userParts,
      });
    } else if (fragment.type === 'THINK') {
      if (fragment.content?.trim()) {
        currentAssistantReasoning.push(fragment.content.trim());
      }
    } else if (fragment.type === 'RESPONSE') {
      if (fragment.content) {
        currentAssistantContent += fragment.content;
      }
    }
  }

  // Flush remaining assistant content
  if (currentAssistantContent.trim() || currentAssistantReasoning.length > 0) {
    const parts: InterlocutorMessage['parts'] = [];
    for (const reasoning of currentAssistantReasoning) {
      parts.push({
        type: 'reasoning',
        text: reasoning,
        state: 'done',
      } as InterlocutorMessage['parts'][number]);
    }
    if (currentAssistantContent.trim()) {
      const textContent = currentAssistantContent.trim();
      // Extract citations from text (these may still be in the text content)
      const citations = extractCitations(textContent);

      const textPart: InterlocutorMessage['parts'][number] = {
        type: 'text',
        text: textContent,
      };

      // Add citations if found
      if (citations.length > 0) {
        textPart.citations = citations;
      }

      // Add tool calls if found (from structured fragments)
      if (toolCalls.length > 0) {
        const firstToolCall = toolCalls[0];
        textPart.toolCallId = firstToolCall.toolCallId;
        textPart.toolName = firstToolCall.toolName;
        textPart.toolInput = firstToolCall.toolInput;
        textPart.toolOutput = firstToolCall.toolOutput;
      }

      // Add search results if found (from structured fragments)
      if (searchResults.length > 0) {
        textPart.searchResults = searchResults;
      }

      parts.push(textPart);
    }
    if (parts.length > 0) {
      // Extract text content for deterministic ID generation
      const remainingTextContent = parts
        .filter((part) => part.type === 'text' && part.text)
        .map((part) => part.text)
        .join(' ');
      result.push({
        id: generateDeterministicMessageId(
          remainingTextContent,
          'assistant',
          message.inserted_at,
          messageIndexRef.current++
        ),
        role: 'assistant',
        createdAt: message.inserted_at,
        parts,
      });
    }
  }

  return result;
}
