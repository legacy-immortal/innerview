/**
 * MessageBubblePart.tsx — Dispatcher rendering a single message part by kind.
 *
 * @module components/chat/condensed/MessageBubblePart
 */

import {
  getToolOrDynamicToolName,
  isFileUIPart,
  isReasoningUIPart,
  isTextUIPart,
  isToolOrDynamicToolUIPart,
  type ReasoningUIPart,
  type UIMessage,
} from 'ai';
import { MemoryIndicator } from '../shared/MemoryIndicator';
import { FilePart } from './messageBubbleFilePart';
import { ReasoningPart } from './messageBubbleReasoningPart';
import { TextPart, type ExtendedTextPart } from './messageBubbleTextPart';

interface MessageBubblePartProps {
  readonly part: UIMessage['parts'][number];
  readonly messageId: string;
  readonly index: number;
  readonly collapsedSections: Set<string>;
  readonly onToggleSection: (sectionId: string) => void;
}

export const MessageBubblePart = ({
  part,
  messageId,
  index,
  collapsedSections,
  onToggleSection,
}: MessageBubblePartProps) => {
  if (isReasoningUIPart(part)) {
    const sectionId = `reasoning-${messageId}-${index}`;
    return (
      <ReasoningPart
        part={part as ReasoningUIPart}
        sectionId={sectionId}
        isCollapsed={collapsedSections.has(sectionId)}
        onToggle={onToggleSection}
        index={index}
      />
    );
  }
  if (isFileUIPart(part)) {
    return (
      <FilePart
        part={part as unknown as Record<string, unknown> & { url?: string }}
        index={index}
      />
    );
  }
  if (isTextUIPart(part)) {
    return (
      <TextPart
        part={part as unknown as ExtendedTextPart}
        messageId={messageId}
        index={index}
        collapsedSections={collapsedSections}
        onToggleSection={onToggleSection}
      />
    );
  }
  if (isToolOrDynamicToolUIPart(part)) {
    const toolName = getToolOrDynamicToolName(part);
    if (
      toolName === 'queryKnowledgeGraph' ||
      toolName === 'queryAssociativeMemory'
    ) {
      return (
        <MemoryIndicator
          key={index}
          toolName={toolName}
          state={part.state}
          output={
            part.state === 'output-available' &&
            'output' in part &&
            (part as { output?: unknown }).output
              ? String((part as { output?: unknown }).output)
              : undefined
          }
        />
      );
    }
  }
  return null;
};
