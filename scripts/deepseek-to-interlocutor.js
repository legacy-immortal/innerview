#!/usr/bin/env node

/**
 * DeepSeek Conversations to Interlocutor Chat Converter
 * Converts DeepSeek conversation format to Interlocutor message format
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Message types for Interlocutor chat system
 */
class InterlocutorMessage {
  constructor(id, role, parts) {
    this.id = id;
    this.role = role; // 'user' | 'assistant'
    this.parts = parts;
  }

  /**
   * Create a message with a single text part (for user messages)
   */
  static createTextMessage(id, role, text) {
    return new InterlocutorMessage(id, role, [{ type: 'text', text }]);
  }

  /**
   * Create a message with multiple parts (for assistant messages with reasoning)
   */
  static createMessageWithParts(id, role, parts) {
    return new InterlocutorMessage(id, role, parts);
  }
}

/**
 * Convert DeepSeek conversation to Interlocutor format
 */
class ConversationConverter {
  constructor() {
    this.messageCounter = 0;
  }

  /**
   * Generate unique message ID
   */
  generateMessageId() {
    this.messageCounter++;
    return `msg_${Date.now()}_${this.messageCounter}`;
  }

  /**
   * Find root node in mapping
   */
  findRoot(mapping) {
    // Root node has parent = null
    for (const [key, node] of Object.entries(mapping)) {
      if (node.parent === null) {
        return node;
      }
    }
    return null;
  }

  /**
   * Traverse conversation tree and extract messages in order
   */
  traverseConversation(mapping, nodeId, visited = new Set()) {
    if (visited.has(nodeId)) {
      return [];
    }

    visited.add(nodeId);
    const node = mapping[nodeId];
    if (!node) {
      return [];
    }

    const messages = [];

    // Process current node
    if (node.message && node.message.fragments) {
      const interlocutorMessages = this.convertFragmentsToMessages(
        node.message.fragments,
        node.message
      );
      messages.push(...interlocutorMessages);
    }

    // Process children in order
    if (node.children && node.children.length > 0) {
      for (const childId of node.children) {
        const childMessages = this.traverseConversation(
          mapping,
          childId,
          visited
        );
        messages.push(...childMessages);
      }
    }

    return messages;
  }

  /**
   * Get media type from filename
   */
  getMediaType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mediaTypes = {
      '.txt': 'text/plain',
      '.py': 'text/x-python',
      '.js': 'text/javascript',
      '.ts': 'text/typescript',
      '.json': 'application/json',
      '.md': 'text/markdown',
      '.html': 'text/html',
      '.css': 'text/css',
      '.csv': 'text/csv',
      '.xml': 'application/xml',
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
    };
    return mediaTypes[ext] || 'application/octet-stream';
  }

  /**
   * Convert file to FileUIPart
   */
  convertFileToUIPart(file) {
    if (!file || !file.file_name) {
      return null;
    }

    // Convert content to data URL if present
    let url = '';
    if (file.content) {
      const mediaType = this.getMediaType(file.file_name);
      const base64Content = Buffer.from(file.content, 'utf8').toString(
        'base64'
      );
      url = `data:${mediaType};base64,${base64Content}`;
    } else {
      // If no content, create a placeholder URL
      url = `file://${file.file_name}`;
    }

    return {
      type: 'file',
      mediaType: this.getMediaType(file.file_name),
      filename: file.file_name,
      url: url,
    };
  }

  /**
   * Convert DeepSeek fragments to Interlocutor messages
   */
  convertFragmentsToMessages(fragments, message = null) {
    const messages = [];
    let currentAssistantReasoning = [];
    let currentAssistantContent = '';
    let currentUserFiles = [];
    let currentAssistantFiles = [];

    // Extract files from message if available
    const messageFiles = message && message.files ? message.files : [];

    for (const fragment of fragments) {
      if (fragment.type === 'REQUEST') {
        // Flush any pending assistant message before processing user message
        if (
          currentAssistantContent.trim() ||
          currentAssistantReasoning.length > 0 ||
          currentAssistantFiles.length > 0
        ) {
          const parts = [];
          // Add reasoning parts first
          for (const reasoning of currentAssistantReasoning) {
            parts.push({
              type: 'reasoning',
              text: reasoning,
              state: 'done',
            });
          }
          // Add file parts
          for (const filePart of currentAssistantFiles) {
            parts.push(filePart);
          }
          // Add text part if there's content
          if (currentAssistantContent.trim()) {
            parts.push({
              type: 'text',
              text: currentAssistantContent.trim(),
            });
          }
          if (parts.length > 0) {
            messages.push(
              InterlocutorMessage.createMessageWithParts(
                this.generateMessageId(),
                'assistant',
                parts
              )
            );
          }
          currentAssistantReasoning = [];
          currentAssistantContent = '';
          currentAssistantFiles = [];
        }

        // User message - check if this REQUEST has associated files
        // Files are typically associated with the message, so we'll add them to the first REQUEST
        const userParts = [];
        if (currentUserFiles.length === 0 && messageFiles.length > 0) {
          // Convert files for user message
          for (const file of messageFiles) {
            const filePart = this.convertFileToUIPart(file);
            if (filePart) {
              currentUserFiles.push(filePart);
            }
          }
        }

        // Add files first, then text
        userParts.push(...currentUserFiles);
        userParts.push({
          type: 'text',
          text: fragment.content,
        });

        messages.push(
          InterlocutorMessage.createMessageWithParts(
            this.generateMessageId(),
            'user',
            userParts
          )
        );
        currentUserFiles = []; // Reset after use
      } else if (fragment.type === 'THINK') {
        // Preserve reasoning/thoughts as reasoning parts
        if (fragment.content && fragment.content.trim()) {
          currentAssistantReasoning.push(fragment.content.trim());
        }
      } else if (fragment.type === 'RESPONSE') {
        // Assistant response text
        currentAssistantContent += fragment.content;
        // Files in assistant messages would be in the message object
        // We'll add them when flushing the assistant message
      }
    }

    // Flush any remaining assistant content
    if (
      currentAssistantContent.trim() ||
      currentAssistantReasoning.length > 0 ||
      currentAssistantFiles.length > 0
    ) {
      const parts = [];
      // Add reasoning parts first
      for (const reasoning of currentAssistantReasoning) {
        parts.push({
          type: 'reasoning',
          text: reasoning,
          state: 'done',
        });
      }
      // Add file parts
      for (const filePart of currentAssistantFiles) {
        parts.push(filePart);
      }
      // Add text part if there's content
      if (currentAssistantContent.trim()) {
        parts.push({
          type: 'text',
          text: currentAssistantContent.trim(),
        });
      }
      if (parts.length > 0) {
        messages.push(
          InterlocutorMessage.createMessageWithParts(
            this.generateMessageId(),
            'assistant',
            parts
          )
        );
      }
    }

    return messages;
  }

  /**
   * Convert single conversation
   */
  convertConversation(conversation) {
    const result = {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.inserted_at,
      updatedAt: conversation.updated_at,
      messages: [],
    };

    if (!conversation.mapping) {
      return result;
    }

    // Find root and traverse
    const root = this.findRoot(conversation.mapping);
    if (root) {
      result.messages = this.traverseConversation(
        conversation.mapping,
        root.id
      );
    }

    return result;
  }

  /**
   * Convert multiple conversations
   */
  convertConversations(conversations) {
    return conversations.map((conv) => this.convertConversation(conv));
  }

  /**
   * Load and convert conversations from file
   */
  convertFromFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const conversations = JSON.parse(content);

    return this.convertConversations(conversations);
  }

  /**
   * Save converted conversations to file
   */
  saveToFile(conversations, outputPath) {
    const jsonContent = JSON.stringify(conversations, null, 2);
    fs.writeFileSync(outputPath, jsonContent);
    console.log(`Converted conversations saved to ${outputPath}`);
  }
}

// CLI functionality
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log(
      '  node deepseek-to-interlocutor.js <input-file> [output-file]'
    );
    console.log('  node deepseek-to-interlocutor.js --help');
    console.log('');
    console.log('Examples:');
    console.log('  node deepseek-to-interlocutor.js conversations.json');
    console.log(
      '  node deepseek-to-interlocutor.js conversations.json interlocutor-chats.json'
    );
    console.log('');
    console.log('Description:');
    console.log(
      '  Converts DeepSeek conversation format to Interlocutor chat format.'
    );
    console.log('  REQUEST fragments become user messages.');
    console.log('  RESPONSE fragments become assistant message text parts.');
    console.log(
      '  THINK fragments are preserved as reasoning parts in assistant messages.'
    );
    console.log('  Files are preserved as file parts in messages.');
    return;
  }

  if (args[0] === '--help' || args[0] === '-h') {
    main(); // Show usage
    return;
  }

  const converter = new ConversationConverter();

  try {
    const inputFile = args[0];
    const outputFile = args[1] || 'interlocutor-conversations.json';

    console.log(`Converting ${inputFile}...`);
    const converted = converter.convertFromFile(inputFile);

    console.log(`Converted ${converted.length} conversations`);
    console.log(
      `Total messages: ${converted.reduce((sum, conv) => sum + conv.messages.length, 0)}`
    );

    converter.saveToFile(converted, outputFile);

    // Show sample of first conversation
    if (converted.length > 0) {
      console.log('\nSample conversion:');
      console.log(`Title: ${converted[0].title}`);
      console.log(`Messages: ${converted[0].messages.length}`);
      if (converted[0].messages.length > 0) {
        console.log(
          `First message: ${converted[0].messages[0].role} - ${converted[0].messages[0].parts[0].text.substring(0, 100)}...`
        );
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run CLI if called directly
if (process.argv[1]?.endsWith('deepseek-to-interlocutor.js')) {
  main();
}
