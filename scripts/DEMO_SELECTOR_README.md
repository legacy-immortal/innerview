# Demo Chat Selector

A command-line tool to select conversations from the DeepSeek conversion output and create demo chat files for the Interlocutor frontend.

## Overview

This script allows you to easily select specific conversations from your converted DeepSeek data and create demo chat files that can be loaded by the Interlocutor chat component.

## Usage

### List Available Conversations

```bash
node select-demo-chat.js interlocutor-conversations.json --list
```

### Select by Title (Partial Match)

```bash
node select-demo-chat.js interlocutor-conversations.json --title "XGBoost" demo-chat.js
```

### Select by Number (Interactive)

```bash
node select-demo-chat.js interlocutor-conversations.json --interactive demo-chat.js
```

### Quick Selection (First Conversation)

```bash
node select-demo-chat.js interlocutor-conversations.json demo-chat.js
```

## Options

- `<conversations-file>` - Path to the interlocutor-conversations.json file
- `[output-file]` - Output file path (default: `demo-chat.js`)
- `--list, -l` - List all available conversations
- `--title, -t <search>` - Search conversations by title
- `--interactive, -i` - Interactive selection mode
- `--help, -h` - Show help

## Output Format

The generated file exports a `demoMessages` array in the exact format expected by the Interlocutor chat component:

```javascript
export const demoMessages = [
  {
    id: 'msg_123456789_1',
    role: 'user',
    parts: [{ type: 'text', text: 'User message' }],
  },
  {
    id: 'msg_123456789_2',
    role: 'assistant',
    parts: [{ type: 'text', text: 'Assistant response' }],
  },
];
```

## Integration

To use the generated demo chat in your Interlocutor component:

1. Copy the generated `demo-chat.js` file to your src directory
2. Import it in your component:
   ```typescript
   import { demoMessages } from './demo-chat.js';
   ```
3. Replace the default `demoMessages` in `InterlocutorChat.tsx`

## Examples

### Select XGBoost Conversation

```bash
node select-demo-chat.js interlocutor-conversations.json --title "XGBoost" src/demo-xgboost.js
```

### Interactive Selection

```bash
node select-demo-chat.js interlocutor-conversations.json --interactive
# Then choose from the numbered list
```

### List All Conversations

```bash
node select-demo-chat.js interlocutor-conversations.json --list | head -20
```
