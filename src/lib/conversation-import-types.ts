/**
 * @file DeepSeek and Interlocutor import payload types.
 * @module lib/conversation-import-types.ts
 */
// DeepSeek / Interlocutor import format types (extracted from conversation-importer.ts).
// DeepSeek conversation types
export interface DeepSeekFragment {
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

export interface DeepSeekFile {
  id?: string;
  file_name: string;
  content?: string;
}

export interface DeepSeekMessage {
  files: DeepSeekFile[];
  model: string;
  inserted_at: string;
  fragments: DeepSeekFragment[];
}

export interface DeepSeekMappingNode {
  id: string;
  parent: string | null;
  children: string[];
  message: DeepSeekMessage;
}

export interface DeepSeekConversation {
  id: string;
  title: string;
  inserted_at: string;
  updated_at: string;
  mapping: Record<string, DeepSeekMappingNode>;
}

// Converted Interlocutor format
export interface InterlocutorMessage {
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

export interface InterlocutorConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: InterlocutorMessage[];
}
