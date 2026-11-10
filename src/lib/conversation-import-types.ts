/**
 * @file DeepSeek and Interlocutor import payload types.
 * @module lib/conversation-import-types.ts
 */
// DeepSeek / Interlocutor import format types (extracted from conversation-importer.ts).
// DeepSeek conversation types

/**
 * A single fragment of a DeepSeek message (reasoning, response, search,
 * tool call, …).
 */
export interface DeepSeekFragment {
  readonly type: string;
  readonly content?: string;
  readonly results?: Array<{
    readonly url?: string;
    readonly title?: string;
    readonly snippet?: string;
    readonly cite_index?: number | null;
    readonly published_at?: string | null;
    readonly site_name?: string | null;
    readonly site_icon?: string | null;
    readonly query_indexes?: number[];
  }>;
  /** Tool call fragments (if any). */
  readonly tool?: string;
  readonly tool_call_id?: string;
  readonly input?: unknown;
  readonly output?: unknown;
}

/** A file attached to a DeepSeek message. */
export interface DeepSeekFile {
  readonly id?: string;
  readonly file_name: string;
  readonly content?: string;
}

/** A DeepSeek message with its files, model, timestamp, and fragments. */
export interface DeepSeekMessage {
  readonly files: DeepSeekFile[];
  readonly model: string;
  readonly inserted_at: string;
  readonly fragments: DeepSeekFragment[];
}

/** A node in the DeepSeek conversation mapping tree. */
export interface DeepSeekMappingNode {
  readonly id: string;
  readonly parent: string | null;
  readonly children: string[];
  readonly message: DeepSeekMessage;
}

/**
 * DeepSeek conversation in its native mapping-tree format.
 * Converted to Interlocutor format by {@link convertDeepSeekConversation}.
 */
export interface DeepSeekConversation {
  readonly id: string;
  readonly title: string;
  readonly inserted_at: string;
  readonly updated_at: string;
  readonly mapping: Record<string, DeepSeekMappingNode>;
}

// Converted Interlocutor format

/**
 * A single message in the converted Interlocutor format.
 */
export interface InterlocutorMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant' | 'system';
  readonly createdAt?: string;
  readonly parts: Array<{
    type: string;
    text?: string;
    filename?: string;
    url?: string;
    mediaType?: string;
    state?: string;
    /** Citation support. */
    citations?: Array<{
      id?: string;
      title?: string;
      url?: string;
      snippet?: string;
    }>;
    /** Tool call support. */
    toolCallId?: string;
    toolName?: string;
    toolInput?: unknown;
    toolOutput?: unknown;
    /** Web search results. */
    searchResults?: Array<{
      title?: string;
      url?: string;
      snippet?: string;
    }>;
  }>;
}

/**
 * A conversation in the converted Interlocutor format.
 * Produced by {@link convertDeepSeekConversation} or parsed directly by
 * {@link parseImportFile}.
 */
export interface InterlocutorConversation {
  readonly id: string;
  readonly title: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly messages: InterlocutorMessage[];
}
