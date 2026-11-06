// Conversation import utility
// Handles importing conversations from DeepSeek format or converted Interlocutor format

import type { Conversation, ConversationMessage } from './conversation-store';
import type { UIMessage } from 'ai';

// Generate deterministic but unique hash ID from message content
// Includes index to ensure uniqueness even for duplicate content
function generateDeterministicMessageId(
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

// DeepSeek conversation types
interface DeepSeekFragment {
  type: string;
  content?: string;
  results?: Array<{
    url?: string;
    title?: string;
    snippet?: string;
    cite_index?: number | null;
    published_at?: string | null;
    site_name?: string | null;
    site_icon?: string | null;
    query_indexes?: number[];
  }>;
  // Tool call fragments (if any)
  tool?: string;
  tool_call_id?: string;
  input?: unknown;
  output?: unknown;
}

interface DeepSeekFile {
  id?: string;
  file_name: string;
  content?: string;
}

interface DeepSeekMessage {
  files: DeepSeekFile[];
  model: string;
  inserted_at: string;
  fragments: DeepSeekFragment[];
}

interface DeepSeekMappingNode {
  id: string;
  parent: string | null;
  children: string[];
  message: DeepSeekMessage;
}

interface DeepSeekConversation {
  id: string;
  title: string;
  inserted_at: string;
  updated_at: string;
  mapping: Record<string, DeepSeekMappingNode>;
}

// Converted Interlocutor format
interface InterlocutorMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  createdAt?: string;
  parts: Array<{
    type: string;
    text?: string;
    filename?: string;
    url?: string;
    mediaType?: string;
    state?: string;
    // Citation support
    citations?: Array<{
      id?: string;
      title?: string;
      url?: string;
      snippet?: string;
    }>;
    // Tool call support
    toolCallId?: string;
    toolName?: string;
    toolInput?: unknown;
    toolOutput?: unknown;
    // Web search results
    searchResults?: Array<{
      title?: string;
      url?: string;
      snippet?: string;
    }>;
  }>;
}

interface InterlocutorConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: InterlocutorMessage[];
}

// Helper to extract citations from text (e.g., [1], [2], or markdown links)
function extractCitations(text: string): Array<{
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

// Note: Tool calls and search results are now extracted directly from structured JSON fragments
// No need for regex-based extraction functions

// Helper to get media type from filename
function getMediaType(filename: string): string {
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

// Convert file to data URL
function convertFileToDataUrl(file: DeepSeekFile): string {
  if (!file.content) {
    return `file://${file.file_name}`;
  }
  const mediaType = getMediaType(file.file_name);
  const base64Content = btoa(unescape(encodeURIComponent(file.content)));
  return `data:${mediaType};base64,${base64Content}`;
}

// Convert DeepSeek file to file part
function convertFileToPart(file: DeepSeekFile) {
  return {
    type: 'file',
    mediaType: getMediaType(file.file_name),
    filename: file.file_name,
    url: convertFileToDataUrl(file),
  };
}

// Find root node in DeepSeek mapping
function findRoot(
  mapping: Record<string, DeepSeekMappingNode>
): DeepSeekMappingNode | null {
  for (const node of Object.values(mapping)) {
    if (node.parent === null) {
      return node;
    }
  }
  return null;
}

// Traverse DeepSeek conversation tree
function traverseDeepSeekConversation(
  mapping: Record<string, DeepSeekMappingNode>,
  nodeId: string,
  visited: Set<string> = new Set(),
  messageIndexRef: { current: number } = { current: 0 },
  onNodeProgress?: (nodeId: string) => void
): InterlocutorMessage[] {
  if (visited.has(nodeId)) {
    return [];
  }

  visited.add(nodeId);
  const node = mapping[nodeId];
  if (!node) {
    return [];
  }

  const messages: InterlocutorMessage[] = [];

  function convertFragmentsToMessages(
    fragments: DeepSeekFragment[],
    message: DeepSeekMessage
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

  // Process current node
  if (node.message?.fragments) {
    const convertedMessages = convertFragmentsToMessages(
      node.message.fragments,
      node.message
    );
    messages.push(...convertedMessages);
    if (convertedMessages.length > 0) {
      onNodeProgress?.(nodeId);
    }
  }

  // Process children
  if (node.children && node.children.length > 0) {
    for (const childId of node.children) {
      const childMessages = traverseDeepSeekConversation(
        mapping,
        childId,
        visited,
        messageIndexRef,
        onNodeProgress
      );
      messages.push(...childMessages);
    }
  }

  return messages;
}

// Convert DeepSeek conversation to Interlocutor format
function convertDeepSeekConversation(
  deepseekConv: DeepSeekConversation,
  onProgress?: (step: string, current: number, total: number) => void
): InterlocutorConversation {
  const messages: InterlocutorMessage[] = [];
  const messageIndexRef = { current: 0 };

  if (deepseekConv.mapping) {
    onProgress?.('Finding conversation root...', 0, 1);
    const root = findRoot(deepseekConv.mapping);
    if (root) {
      // Count total nodes for progress tracking
      const totalNodes = Object.keys(deepseekConv.mapping).length;
      let processedNodes = 0;

      onProgress?.('Traversing conversation tree...', 0, totalNodes);
      const convertedMessages = traverseDeepSeekConversation(
        deepseekConv.mapping,
        root.id,
        new Set(),
        messageIndexRef,
        (nodeId) => {
          processedNodes++;
          onProgress?.(
            `Processing node ${nodeId}... (${processedNodes}/${totalNodes} nodes)`,
            processedNodes,
            totalNodes
          );
        }
      );
      messages.push(...convertedMessages);
      onProgress?.(
        `Converted ${messages.length} messages`,
        messages.length,
        messages.length
      );
    }
  }

  return {
    id: deepseekConv.id,
    title: deepseekConv.title,
    createdAt: deepseekConv.inserted_at,
    updatedAt: deepseekConv.updated_at,
    messages,
  };
}

// Convert Interlocutor message to Message format (for useChat)
function convertToMessageFormat(msg: InterlocutorMessage): UIMessage {
  // Use the existing ID from the message (already generated with index)
  return {
    id: msg.id,
    role: msg.role,
    parts: msg.parts as UIMessage['parts'],
    // Note: createdAt is stored in ConversationMessage, not UIMessage
  };
}

// Extract text content from message parts for preview
function extractTextFromParts(parts: InterlocutorMessage['parts']): string {
  return parts
    .filter((p) => p.type === 'text' && p.text)
    .map((p) => p.text!)
    .join(' ');
}

// Import a single conversation
export function importConversation(
  data: DeepSeekConversation | InterlocutorConversation,
  onProgress?: (step: string, current: number, total: number) => void
): {
  conversation: Conversation;
  messages: UIMessage[];
  conversationMessages?: ConversationMessage[];
} {
  let interlocutorConv: InterlocutorConversation;

  // Check if it's DeepSeek format (has mapping) or Interlocutor format (has messages array)
  if ('mapping' in data && data.mapping) {
    // DeepSeek format - convert it
    onProgress?.('Converting DeepSeek format...', 0, 1);
    interlocutorConv = convertDeepSeekConversation(
      data as DeepSeekConversation,
      onProgress
    );
  } else if ('messages' in data && Array.isArray(data.messages)) {
    // Already in Interlocutor format
    onProgress?.('Processing Interlocutor format...', 0, 1);
    interlocutorConv = data as InterlocutorConversation;
  } else {
    throw new Error('Invalid conversation format');
  }

  // Convert to Message format for useChat
  onProgress?.(
    `Converting ${interlocutorConv.messages.length} messages to UI format...`,
    0,
    interlocutorConv.messages.length
  );
  const messages = interlocutorConv.messages.map((msg, index) => {
    const converted = convertToMessageFormat(msg);
    if (
      (index + 1) % 10 === 0 ||
      index === interlocutorConv.messages.length - 1
    ) {
      onProgress?.(
        `Converting messages... (${index + 1}/${interlocutorConv.messages.length})`,
        index + 1,
        interlocutorConv.messages.length
      );
    }
    return converted;
  });

  // Extract preview from first user message
  const firstUserMessage = interlocutorConv.messages.find(
    (m) => m.role === 'user'
  );
  const preview = firstUserMessage
    ? extractTextFromParts(firstUserMessage.parts)
    : undefined;

  // Get conversation dates with fallbacks
  const conversationCreatedAt =
    interlocutorConv.createdAt || new Date().toISOString();
  const conversationUpdatedAt =
    interlocutorConv.updatedAt || conversationCreatedAt;

  // Create conversation object
  const conversation: Conversation = {
    id:
      interlocutorConv.id ||
      `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    title: interlocutorConv.title || 'Imported Conversation',
    createdAt: conversationCreatedAt,
    updatedAt: conversationUpdatedAt,
    messageCount: interlocutorConv.messages.length,
    preview: preview?.slice(0, 100),
  };

  // Convert messages to ConversationMessage format with dates
  onProgress?.(
    `Preparing ${interlocutorConv.messages.length} messages for storage...`,
    0,
    interlocutorConv.messages.length
  );
  const conversationMessages = interlocutorConv.messages.map((msg, index) => {
    const textContent = extractTextFromParts(msg.parts);
    if (
      (index + 1) % 10 === 0 ||
      index === interlocutorConv.messages.length - 1
    ) {
      onProgress?.(
        `Preparing messages... (${index + 1}/${interlocutorConv.messages.length})`,
        index + 1,
        interlocutorConv.messages.length
      );
    }
    return {
      id: msg.id,
      role: msg.role,
      content: textContent,
      createdAt: msg.createdAt || conversationCreatedAt,
      parts: msg.parts,
    };
  });

  onProgress?.(
    'Import complete!',
    conversationMessages.length,
    conversationMessages.length
  );
  return { conversation, messages, conversationMessages };
}

// Import multiple conversations
export function importConversations(
  data: (DeepSeekConversation | InterlocutorConversation)[]
): Array<{ conversation: Conversation; messages: UIMessage[] }> {
  return data.map((conv) => importConversation(conv));
}

// Parse JSON file content
export async function parseImportFile(file: File): Promise<
  | { type: 'single'; data: DeepSeekConversation | InterlocutorConversation }
  | {
      type: 'multiple';
      data: (DeepSeekConversation | InterlocutorConversation)[];
    }
> {
  const text = await file.text();
  const json = JSON.parse(text);

  // Check if it's an array (multiple conversations) or single object
  if (Array.isArray(json)) {
    return { type: 'multiple', data: json };
  } else {
    return { type: 'single', data: json };
  }
}
