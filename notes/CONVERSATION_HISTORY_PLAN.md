# Conversation History Integration Plan

## Current State Analysis

### Frontend (`src/`)

- **`useInterlocutorChat` hook**: Uses AI SDK's `useChat` with `DefaultChatTransport`
- **No conversation ID management**: Frontend doesn't generate, store, or pass conversation IDs
- **No conversation persistence**: Messages are only in-memory via `useChat` state
- **No conversation list/management**: No UI to create, load, or switch conversations
- **Always sends all messages**: Frontend sends entire message array on each request

### Backend (`server/src/`)

- **`/api/chat` endpoint**: Accepts `messages` and optional `conversationId` (defaults to "default")
- **LangGraph checkpointer**: Uses `MemorySaver` to persist conversation state by `thread_id` (conversationId)
- **Smart message handling**:
  - First message: Passes all messages to initialize thread
  - Subsequent messages: Only passes latest message (checkpointer loads history)
- **Vector store integration**: Stores conversation memories for associative recall
- **Summarization middleware**: Automatically manages conversation summaries

### Key Issues

1. ❌ Frontend doesn't pass `conversationId` to backend
2. ❌ No way to create/load/switch conversations
3. ❌ Frontend always sends all messages (inefficient, doesn't leverage checkpointer)
4. ❌ No conversation metadata (title, timestamp, etc.)
5. ❌ No API to list/retrieve conversations

## Implementation Plan

### Phase 1: Frontend Conversation Management

#### 1.1 Create Conversation Store/Context

**File**: `src/lib/conversation-store.ts` or `src/contexts/ConversationContext.tsx`

```typescript
interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  preview?: string; // First message or summary
}

interface ConversationStore {
  conversations: Conversation[];
  currentConversationId: string | null;
  createConversation: () => string;
  loadConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  updateConversationTitle: (id: string, title: string) => void;
}
```

**Storage Options**:

- **Option A**: LocalStorage (simple, client-side only)
- **Option B**: Backend API (persistent, can sync across devices)
- **Option C**: Hybrid (localStorage + backend sync)

**Recommendation**: Start with LocalStorage, add backend API later

#### 1.2 Update `useInterlocutorChat` Hook

**File**: `src/hooks/useInterlocutorChat.ts`

**Changes**:

- Accept `conversationId` parameter
- Pass `conversationId` in request body via custom transport
- Handle conversation switching (clear messages, load new ones)

```typescript
export const useInterlocutorChat = (conversationId?: string) => {
  return useChat({
    transport: createChatTransport(),
    body: {
      conversationId: conversationId || 'default',
    },
    // Optionally: initialMessages if loading existing conversation
  });
};
```

**Note**: AI SDK's `useChat` supports `body` option to pass additional data

#### 1.3 Customize Chat Transport (if needed)

**File**: `src/lib/chat-transport.ts`

If `body` option doesn't work, create custom transport:

```typescript
export class ConversationChatTransport extends DefaultChatTransport {
  constructor(private conversationId: string) {
    super({ api: chatApi });
  }

  async doFetch(body: any) {
    return super.doFetch({
      ...body,
      conversationId: this.conversationId,
    });
  }
}
```

### Phase 2: Backend Conversation API

#### 2.1 Conversation List Endpoint

**File**: `server/src/routes/conversations.ts` (new)

```typescript
// GET /api/conversations
// Returns list of conversation metadata

// GET /api/conversations/:id
// Returns conversation details and messages

// DELETE /api/conversations/:id
// Deletes a conversation
```

**Implementation**:

- Query LangGraph checkpointer for all thread IDs
- Extract metadata from checkpointer state
- Return conversation list with previews

#### 2.2 Load Conversation Endpoint

**File**: `server/src/routes/chat.ts` (update)

```typescript
// GET /api/chat/:conversationId
// Loads conversation history from checkpointer
// Returns messages in AI SDK format
```

**Implementation**:

- Use checkpointer's `getState()` to retrieve conversation state
- Convert LangChain messages to AI SDK format
- Return messages array

#### 2.3 Conversation Metadata Endpoint

**File**: `server/src/routes/conversations.ts`

```typescript
// GET /api/conversations/:id/metadata
// Returns conversation metadata (title, message count, etc.)
```

### Phase 3: Frontend UI Components

#### 3.1 Conversation Sidebar/List

**File**: `src/components/chat/ConversationList.tsx` (new)

**Features**:

- List of conversations with preview
- Create new conversation button
- Delete conversation
- Active conversation highlight
- Search/filter conversations

#### 3.2 Conversation Title Editor

**File**: `src/components/chat/ConversationTitle.tsx` (new)

**Features**:

- Auto-generate title from first message
- Allow manual editing
- Save to backend

#### 3.3 Update InterlocutorChat Component

**File**: `src/components/chat/InterlocutorChat.tsx`

**Changes**:

- Add conversation management state
- Integrate ConversationList component
- Handle conversation switching
- Load conversation history on mount/switch

### Phase 4: Message History Loading

#### 4.1 Backend: Retrieve from Checkpointer

**File**: `server/src/agents/index.ts`

**New Function**:

```typescript
export const getConversationHistory = async (
  conversationId: string
): Promise<Array<{ role: string; content: string }>> => {
  const agent = await getInterlocutor(conversationId);
  const config = {
    configurable: { thread_id: conversationId },
  };

  // Get state from checkpointer
  const state = await checkpointer.getState(config);

  // Convert LangChain messages to AI SDK format
  return state.values.messages.map((msg) => ({
    role: msg._getType() === 'human' ? 'user' : 'assistant',
    content:
      typeof msg.content === 'string'
        ? msg.content
        : JSON.stringify(msg.content),
  }));
};
```

#### 4.2 Frontend: Load on Conversation Switch

**File**: `src/hooks/useInterlocutorChat.ts` or `src/components/chat/InterlocutorChat.tsx`

**Implementation**:

- Fetch conversation history from backend
- Convert to AI SDK message format
- Initialize `useChat` with `initialMessages`

### Phase 5: Optimize Message Sending

#### 5.1 Backend: Fix Message Handling Logic

**File**: `server/src/agents/index.ts` - `invokeAgent` function

**Current Issue**: Logic assumes first message = length 1, but frontend always sends all messages

**Fix**:

```typescript
// Check if thread exists in checkpointer instead of message count
const threadExists = await checkpointer
  .getState(config)
  .then(() => true)
  .catch(() => false);

return agent.invoke(
  {
    messages: threadExists
      ? [{ role: latestMessage.role, content: latestMessage.content }]
      : messages.map((msg) => ({ role: msg.role, content: msg.content })),
  },
  config
);
```

#### 5.2 Frontend: Only Send Latest Message

**File**: `src/lib/chat-transport.ts` or custom hook

**Option A**: Modify transport to only send latest message if conversationId exists
**Option B**: Let backend handle it (current approach, but needs fix)

**Recommendation**: Fix backend logic (Phase 5.1) - cleaner separation of concerns

## Implementation Order

### Step 1: Basic Conversation ID Passing (Quick Win)

1. Update `useInterlocutorChat` to accept and pass `conversationId`
2. Update `InterlocutorChat` to manage current conversation ID
3. Store conversation ID in localStorage
4. Test: Verify backend receives conversationId

### Step 2: Conversation Persistence (Backend)

1. Create conversation list API endpoint
2. Implement conversation loading from checkpointer
3. Add conversation metadata extraction
4. Test: Verify conversations persist across restarts

### Step 3: Frontend Conversation Management

1. Create ConversationList component
2. Add conversation creation/deletion
3. Implement conversation switching
4. Test: Create, switch, delete conversations

### Step 4: Message History Loading

1. Implement `getConversationHistory` in backend
2. Create load endpoint
3. Update frontend to load messages on conversation switch
4. Test: Switch conversations, verify history loads

### Step 5: Optimize & Polish

1. Fix message sending logic (only send latest if thread exists)
2. Add conversation titles/auto-naming
3. Add search/filter for conversations
4. Add conversation export/import

## Technical Considerations

### Checkpointer State Access

- LangGraph's `MemorySaver` stores state by `thread_id`
- Need to query checkpointer for list of threads
- May need to maintain separate metadata store for faster listing

### Message Format Conversion

- LangChain messages: `HumanMessage`, `AIMessage`, `SystemMessage`
- AI SDK messages: `{ role: 'user' | 'assistant' | 'system', content: string }`
- Need conversion utilities

### Performance

- Loading full conversation history could be slow for long conversations
- Consider pagination or lazy loading
- Summarization middleware already handles this, but initial load still needs all messages

### Error Handling

- What if checkpointer fails?
- What if conversation doesn't exist?
- Handle gracefully with fallbacks

## Files to Create/Modify

### New Files

- `src/lib/conversation-store.ts` - Conversation state management
- `src/components/chat/ConversationList.tsx` - Conversation list UI
- `src/components/chat/ConversationTitle.tsx` - Title editor
- `server/src/routes/conversations.ts` - Conversation API endpoints
- `server/src/utils/message-converter.ts` - LangChain ↔ AI SDK message conversion

### Modified Files

- `src/hooks/useInterlocutorChat.ts` - Add conversationId support
- `src/components/chat/InterlocutorChat.tsx` - Add conversation management
- `src/lib/chat-transport.ts` - Possibly customize for conversationId
- `server/src/routes/chat.ts` - Add conversation loading endpoint
- `server/src/agents/index.ts` - Add getConversationHistory, fix invokeAgent logic

## Testing Checklist

- [ ] Create new conversation, verify ID generated
- [ ] Send messages, verify conversationId passed to backend
- [ ] Switch conversations, verify messages persist
- [ ] Reload page, verify conversation loads
- [ ] Delete conversation, verify removed from list
- [ ] Long conversation (20+ messages), verify performance
- [ ] Checkpointer persistence across server restarts
- [ ] Error handling for missing conversations
