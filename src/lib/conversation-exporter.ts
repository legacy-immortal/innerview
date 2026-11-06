// Conversation export utility
// Handles exporting conversations to JSON or markdown formats

import type { Conversation, ConversationMessage } from './conversation-store';

// Export conversation as JSON (Interlocutor format)
export function exportConversationAsJSON(
  conversation: Conversation,
  messages: ConversationMessage[]
): string {
  const exportData = {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messages: messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      parts: msg.parts || [
        {
          type: 'text',
          text: msg.content,
        },
      ],
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

// Export conversation as formatted markdown
export function exportConversationAsPlaintext(
  conversation: Conversation,
  messages: ConversationMessage[]
): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${conversation.title}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(
    `**Created:** ${new Date(conversation.createdAt).toLocaleString()}`
  );
  lines.push(
    `**Updated:** ${new Date(conversation.updatedAt).toLocaleString()}`
  );
  lines.push(`**Messages:** ${conversation.messageCount}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Messages
  messages.forEach((message, index) => {
    const roleLabel =
      message.role === 'user'
        ? 'User'
        : message.role === 'assistant'
          ? 'Assistant'
          : 'System';

    lines.push(`## ${index + 1}. ${roleLabel}`);
    // Add message date if available
    if (message.createdAt) {
      lines.push(`*${new Date(message.createdAt).toLocaleString()}*`);
    }
    lines.push('');

    // Extract text content from message
    // Prioritize parts if available, otherwise use content
    let textContent = '';
    let citations: Array<{
      id?: string;
      title?: string;
      url?: string;
      snippet?: string;
    }> = [];
    let toolName: string | undefined;
    let toolInput: unknown;
    let toolOutput: unknown;
    let searchResults: Array<{
      title?: string;
      url?: string;
      snippet?: string;
    }> = [];

    if (message.parts) {
      const textPart = message.parts.find((p) => p.type === 'text');
      if (textPart && 'text' in textPart && textPart.text) {
        textContent = textPart.text;
        // Extract rich data from text part
        if ('citations' in textPart && textPart.citations) {
          citations = textPart.citations as typeof citations;
        }
        if ('toolName' in textPart && textPart.toolName) {
          toolName = textPart.toolName as string;
          toolInput = 'toolInput' in textPart ? textPart.toolInput : undefined;
          toolOutput =
            'toolOutput' in textPart ? textPart.toolOutput : undefined;
        }
        if ('searchResults' in textPart && textPart.searchResults) {
          searchResults = textPart.searchResults as typeof searchResults;
        }
      } else {
        const textParts = message.parts
          .filter((p) => p.type === 'text' && 'text' in p && p.text)
          .map((p) => ('text' in p ? p.text : '') || '')
          .join('\n\n');
        if (textParts) {
          textContent = textParts;
        }
      }
    }
    // Fall back to content if no parts or parts had no text
    if (!textContent) {
      textContent = message.content || '';
    }

    // Add message content (preserve markdown formatting)
    if (textContent) {
      lines.push(textContent);
    }

    // Add citations
    if (citations.length > 0) {
      lines.push('');
      lines.push('### Citations');
      lines.push('');
      citations.forEach((citation, idx) => {
        if (citation.url) {
          lines.push(
            `${idx + 1}. [${citation.title || citation.id || `Citation ${idx + 1}`}](${citation.url})`
          );
        } else {
          lines.push(
            `${idx + 1}. ${citation.title || citation.id || `Citation ${idx + 1}`}`
          );
        }
        if (citation.snippet) {
          lines.push(`   > ${citation.snippet}`);
        }
      });
    }

    // Add tool call information
    if (toolName) {
      lines.push('');
      lines.push(`### Tool: ${toolName}`);
      lines.push('');
      if (toolInput) {
        lines.push('**Input:**');
        lines.push('```json');
        lines.push(
          typeof toolInput === 'string'
            ? toolInput
            : JSON.stringify(toolInput, null, 2)
        );
        lines.push('```');
        lines.push('');
      }
      if (toolOutput) {
        lines.push('**Output:**');
        lines.push('```json');
        lines.push(
          typeof toolOutput === 'string'
            ? toolOutput
            : JSON.stringify(toolOutput, null, 2)
        );
        lines.push('```');
      }
    }

    // Add web search results
    if (searchResults.length > 0) {
      lines.push('');
      lines.push('### Search Results');
      lines.push('');
      searchResults.forEach((result, idx) => {
        if (result.url) {
          lines.push(
            `${idx + 1}. [${result.title || `Result ${idx + 1}`}](${result.url})`
          );
        } else {
          lines.push(`${idx + 1}. ${result.title || `Result ${idx + 1}`}`);
        }
        if (result.snippet) {
          lines.push(`   > ${result.snippet}`);
        }
      });
    }

    lines.push('');
    lines.push('');
  });

  // Footer
  lines.push('---');
  lines.push('');
  lines.push(`*End of conversation: ${conversation.title}*`);

  return lines.join('\n');
}

// Download file helper
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export and download conversation as JSON
export function exportAndDownloadJSON(
  conversation: Conversation,
  messages: ConversationMessage[]
): void {
  const jsonContent = exportConversationAsJSON(conversation, messages);
  const filename = `${conversation.title.replace(/[^a-z0-9]/gi, '_')}_${conversation.id}.json`;
  downloadFile(jsonContent, filename, 'application/json');
}

// Export and download conversation as markdown
export function exportAndDownloadPlaintext(
  conversation: Conversation,
  messages: ConversationMessage[]
): void {
  const textContent = exportConversationAsPlaintext(conversation, messages);
  const filename = `${conversation.title.replace(/[^a-z0-9]/gi, '_')}_${conversation.id}.md`;
  downloadFile(textContent, filename, 'text/markdown');
}
