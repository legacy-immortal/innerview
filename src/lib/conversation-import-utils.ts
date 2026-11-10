/**
 * @file Helpers for importing conversations: deterministic IDs, citations, media, and format conversion.
 * @module lib/conversation-import-utils.ts
 */
// Helpers for conversation import: deterministic IDs, citations, media, format conversion.
import type {
  DeepSeekFile,
  InterlocutorMessage,
} from './conversation-import-types';
import type { UIMessage } from 'ai';
/**
 * Generate a deterministic, non-cryptographic message id from content, role,
 * timestamp, and optional index. The index suffix guarantees uniqueness even
 * with hash collisions.
 * @param content - Message text content.
 * @param role - Message role.
 * @param timestamp - Optional message timestamp.
 * @param index - Optional index suffix for uniqueness.
 * @returns An id like `msg_<base36hash>[_<index>]`.
 * @see {@link extractCitations}
 */
export function generateDeterministicMessageId(
  content: string,
  role: string,
  timestamp?: string,
  index?: number
): string {
  // Create a combined string for hashing
  // Include index to ensure uniqueness
  const hashInput = `${role}:${content}:${timestamp || ''}:${index ?? ''}`;

  // Simple hash function (non-crypto, but deterministic)
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Make it positive and convert to base36 for shorter string
  const positiveHash = Math.abs(hash);
  const base36Hash = positiveHash.toString(36);

  // Add index suffix to ensure uniqueness even with hash collisions
  const indexSuffix = index !== undefined ? `_${index}` : '';

  return `msg_${base36Hash}${indexSuffix}`;
}

/**
 * Extract citations from message text.
 *
 * Matches markdown links `[text](url)` and citation markers `[1]`, `[2]`,
 * etc. When markers exist without links, placeholder citations are created.
 * @param text - Message text to scan.
 * @returns Array of citations (may be empty).
 * @see {@link generateDeterministicMessageId}
 */
export function extractCitations(text: string): Array<{
  id?: string;
  title?: string;
  url?: string;
  snippet?: string;
}> {
  const citations: Array<{
    id?: string;
    title?: string;
    url?: string;
    snippet?: string;
  }> = [];

  // Match markdown links: [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = markdownLinkRegex.exec(text)) !== null) {
    citations.push({
      title: match[1],
      url: match[2],
    });
  }

  // Match citation markers like [1], [2], etc.
  const citationMarkerRegex = /\[(\d+)\]/g;
  const citationNumbers = new Set<string>();
  while ((match = citationMarkerRegex.exec(text)) !== null) {
    citationNumbers.add(match[1]);
  }

  // If we found citation markers but no markdown links, create placeholder citations
  if (citationNumbers.size > 0 && citations.length === 0) {
    for (const num of Array.from(citationNumbers).sort()) {
      citations.push({
        id: num,
        title: `Citation ${num}`,
      });
    }
  }

  return citations;
}

export function getMediaType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mediaTypes: Record<string, string> = {
    txt: 'text/plain',
    py: 'text/x-python',
    js: 'text/javascript',
    ts: 'text/typescript',
    json: 'application/json',
    md: 'text/markdown',
    html: 'text/html',
    css: 'text/css',
    csv: 'text/csv',
    xml: 'application/xml',
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
  };
  return mediaTypes[ext] || 'application/octet-stream';
}

/**
 * Convert a DeepSeek file entry to a data URL.
 * @param file - The DeepSeek file containing the name and base64 content.
 * @returns A `data:` URL, or `file://<file_name>` when content is empty.
 * @see {@link convertFileToPart}
 */
export function convertFileToDataUrl(file: DeepSeekFile): string {
  if (!file.content) {
    return `file://${file.file_name}`;
  }
  const mediaType = getMediaType(file.file_name);
  const base64Content = btoa(unescape(encodeURIComponent(file.content)));
  return `data:${mediaType};base64,${base64Content}`;
}

/**
 * File part shape produced from an imported {@link DeepSeekFile}.
 * Embedded in `InterlocutorMessage['parts']` with `type: 'file'`.
 */
export interface ConvertedFilePart {
  readonly type: 'file';
  readonly mediaType: string;
  readonly filename: string;
  readonly url: string;
}

/**
 * Converts a DeepSeek file entry into an importable file part.
 * @param file - The DeepSeek file containing the name and base64 content.
 * @returns The constructed file part.
 */
export function convertFileToPart(file: DeepSeekFile): ConvertedFilePart {
  return {
    type: 'file',
    mediaType: getMediaType(file.file_name),
    filename: file.file_name,
    url: convertFileToDataUrl(file),
  };
}

/**
 * Converts an Interlocutor message into an AI SDK UIMessage.
 *
 * Reuses the existing deterministic id. `createdAt` is stored in
 * ConversationMessage, not UIMessage, so it is dropped here.
 * @param msg - The source Interlocutor message.
 * @returns The converted UI message.
 * @see {@link uiMessageToConversationMessage} for the inverse direction
 */
export function convertToMessageFormat(msg: InterlocutorMessage): UIMessage {
  // Use the existing ID from the message (already generated with index)
  return {
    id: msg.id,
    role: msg.role,
    parts: msg.parts as UIMessage['parts'],
    // Note: createdAt is stored in ConversationMessage, not UIMessage
  };
}

/**
 * Extract text content from message parts for preview.
 * @param parts - Message parts to scan.
 * @returns Joined text of all text parts, or an empty string.
 */
export function extractTextFromParts(
  parts: InterlocutorMessage['parts']
): string {
  return parts
    .filter((p) => p.type === 'text' && p.text)
    .map((p) => p.text!)
    .join(' ');
}
