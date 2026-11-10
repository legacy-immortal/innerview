/**
 * @file DeepSeek conversation tree traversal and conversion into Interlocutor format.
 * @module lib/deepSeekConverter.ts
 */
// DeepSeek conversation tree traversal/conversion (extracted from conversation-importer.ts).
import type {
  DeepSeekConversation,
  DeepSeekMappingNode,
  InterlocutorConversation,
  InterlocutorMessage,
} from './conversation-import-types';
import { convertFragmentsToMessages } from './deepSeekFragmentConverter';
/**
 * Find the root node of a DeepSeek mapping tree (the node whose parent is null).
 * @param mapping - DeepSeek mapping node records keyed by node id.
 * @returns The root node, or null if none has a null parent.
 */
export function findRoot(
  mapping: Record<string, DeepSeekMappingNode>
): DeepSeekMappingNode | null {
  for (const node of Object.values(mapping)) {
    if (node.parent === null) {
      return node;
    }
  }
  return null;
}

/**
 * Depth-first traversal of a DeepSeek conversation mapping tree.
 *
 * Converts each node's fragments to Interlocutor messages, skipping already
 * visited nodes to guard against cycles. Emits `onNodeProgress` per converted
 * node.
 * @param mapping - DeepSeek mapping node records keyed by node id.
 * @param nodeId - Node to start traversal from.
 * @param visited - Set of already-visited node ids (cycle guard).
 * @param messageIndexRef - Mutable counter used for deterministic message ids.
 * @param onNodeProgress - Optional callback invoked per converted node id.
 * @returns Converted Interlocutor messages in traversal order.
 * @see {@link convertDeepSeekConversation}
 */
export function traverseDeepSeekConversation(
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

  // Process current node
  if (node.message?.fragments) {
    const convertedMessages = convertFragmentsToMessages(
      node.message.fragments,
      node.message,
      messageIndexRef
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

/**
 * Convert a DeepSeek conversation to Interlocutor format.
 *
 * Finds the mapping-tree root, traverses it via
 * {@link traverseDeepSeekConversation}, and preserves the conversation id,
 * title, and timestamps.
 * @param deepseekConv - DeepSeek conversation payload.
 * @param onProgress - Optional progress callback (step, current, total).
 * @returns The converted Interlocutor conversation.
 * @see {@link findRoot}
 * @see {@link traverseDeepSeekConversation}
 */
export function convertDeepSeekConversation(
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
