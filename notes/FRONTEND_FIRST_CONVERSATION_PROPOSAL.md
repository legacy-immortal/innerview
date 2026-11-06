# Frontend-First Conversation Management Proposal

## Philosophy

**Frontend owns conversation state, backend owns agent execution.**

The frontend manages all conversation metadata, lists, and message history. The backend focuses solely on:

- Accepting `conversationId` and using it for checkpointer thread management
- Executing the agent with proper context
- Persisting agent state via checkpointer (automatic)

This approach:

- ✅ Simplifies backend significantly
- ✅ Leverages existing Zustand store with persistence
- ✅ No need for backend conversation list/metadata APIs
- ✅ Frontend has full control over UX
- ✅ Easier to add features like search, filtering, etc.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Zustand)                │
├─────────────────────────────────────────────────────────────┤
│  • Conversation list management                              │
│  • Conversation metadata (titles, previews, timestamps)     │
│  • Message history storage (in Zustand + localStorage)      │
│  • Conversation switching logic                              │
│  • UI components (ConversationList, etc.)                   │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ conversationId + messages
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Hono + LangGraph)                │
├─────────────────────────────────────────────────────────────┤
│  • Accept conversationId                                     │
│  • Use checkpointer with thread_id = conversationId         │
│  • Execute agent (checkpointer handles history)              │
│  • Return response                                           │
│  • Optional: Load conversation history endpoint              │
└─────────────────────────────────────────────────────────────┘
```

## Frontend Responsibilities

### 1. Conversation State Management (Zustand Store)

**Already Implemented:**

- ✅ Conversation list (`conversations` array)
- ✅ Current conversation ID
- ✅ Metadata (title, preview, timestamps, message count)
- ✅ CRUD operations (create, delete, update)
- ✅ LocalStorage persistence

**To Add:**

- Message history storage per conversation
- Conversation loading/switching logic
- Auto-title generation from first message

### 2. Message History Storage

**Option A: Store in Zustand (Recommended for now)**

```typescript
interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  preview?: string;
  messages?: Array<{ role: string; content: string; id: string }>; // NEW
}
```

**Pros:**

- Simple, everything in one place
- Fast access
- Works with existing persistence

**Cons:**

- LocalStorage size limits (~5-10MB)
- Not ideal for very long conversations

**Option B: IndexedDB (Future enhancement)**

- For conversations with 100+ messages
- Can store much more data
- Still frontend-only

**Recommendation:** Start with Option A, add Option B later if needed.

### 3. Conversation Switching Logic

**Flow:**

1. User clicks conversation in list
2. Frontend:
   - Saves current conversation messages to store
   - Switches `currentConversationId`
   - Loads messages from store for new conversation
   - Initializes `useChat` with `initialMessages`
3. Backend: Just receives new `conversationId` on next message

**Implementation:**

```typescript
// In ConversationList component
const switchConversation = (id: string) => {
  // Save current conversation messages
  const currentMessages = useChatStore.getState().messages;
  if (currentConversationId) {
    useConversationStore
      .getState()
      .saveConversationMessages(currentConversationId, currentMessages);
  }

  // Load new conversation messages
  const conversation = useConversationStore
    .getState()
    .conversations.find((c) => c.id === id);

  // Switch conversation
  useConversationStore.getState().setCurrentConversation(id);

  // Reset chat hook with new messages
  // (This will require resetting useChat or using key prop)
};
```

### 4. Message History Loading

**On Conversation Switch:**

- Load messages from Zustand store
- Initialize `useChat` with `initialMessages` prop
- If no messages in store, optionally fetch from backend (see Backend section)

**On App Load:**

- Load conversation list from Zustand (automatic via persistence)
- Load current conversation messages
- Initialize chat with those messages

## Backend Responsibilities

### 1. Agent Execution (Current - No Changes Needed)

**Current Implementation:**

```typescript
// server/src/routes/chat.ts
app.post('/api/chat', async (c) => {
  const { messages, conversationId } = await c.req.json();
  // ... invoke agent with conversationId
});
```

**What it does:**

- ✅ Accepts `conversationId`
- ✅ Uses it as `thread_id` for checkpointer
- ✅ Checkpointer automatically loads conversation history
- ✅ Agent executes with full context

**No changes needed!** This already works.

### 2. Fix Message Handling Logic (Optional Optimization)

**Current Issue:**

```typescript
// server/src/agents/index.ts
const isFirstMessage = messages.length === 1;
```

**Problem:** Frontend always sends all messages, so `isFirstMessage` is wrong.

**Solution:** Check if thread exists in checkpointer:

```typescript
// Check if thread exists instead of message count
const config = {
  configurable: { thread_id: conversationId },
};

let threadExists = false;
try {
  const state = await checkpointer.getState(config);
  threadExists = !!state;
} catch {
  threadExists = false;
}

return agent.invoke(
  {
    messages: threadExists
      ? [{ role: latestMessage.role, content: latestMessage.content }]
      : messages.map((msg) => ({ role: msg.role, content: msg.content })),
  },
  config
);
```

**Benefit:** Only sends latest message if thread exists (more efficient).

### 3. Optional: Load Conversation History Endpoint

**Purpose:** Fallback if frontend loses messages (e.g., localStorage cleared).

**Endpoint:** `GET /api/chat/:conversationId/history`

**Implementation:**

```typescript
// server/src/routes/chat.ts
app.get('/api/chat/:conversationId/history', async (c) => {
  const conversationId = c.req.param('conversationId');

  try {
    const config = {
      configurable: { thread_id: conversationId },
    };

    const state = await checkpointer.getState(config);

    // Convert LangChain messages to AI SDK format
    const messages = state.values.messages.map((msg) => {
      const role = msg._getType() === 'human' ? 'user' : 'assistant';
      const content =
        typeof msg.content === 'string'
          ? msg.content
          : JSON.stringify(msg.content);

      return { role, content };
    });

    return c.json({ messages });
  } catch (error) {
    // Thread doesn't exist
    return c.json({ messages: [] }, 404);
  }
});
```

**Usage:** Frontend calls this only if:

- Messages are missing from store
- User explicitly requests "reload from server"
- Error recovery scenario

## Implementation Plan

### Phase 1: Enhance Frontend Store (Current)

**File:** `src/lib/conversation-store.ts`

**Add:**

```typescript
interface Conversation {
  // ... existing fields
  messages?: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt?: string;
  }>;
}

// New actions:
saveConversationMessages: (id: string, messages: Message[]) => void;
loadConversationMessages: (id: string) => Message[] | undefined;
clearConversationMessages: (id: string) => void;
```

**Benefits:**

- Messages persist in localStorage
- Fast access (no API calls)
- Works offline

### Phase 2: Conversation Switching UI

**File:** `src/components/chat/ConversationList.tsx` (new)

**Features:**

- List conversations from Zustand store
- Show title, preview, timestamp
- Click to switch conversation
- Create new conversation button
- Delete conversation button

**File:** `src/components/chat/InterlocutorChat.tsx` (update)

**Changes:**

- Load messages from store on conversation switch
- Save messages to store when conversation changes
- Initialize `useChat` with `initialMessages`

### Phase 3: Backend Optimization (Optional)

**File:** `server/src/agents/index.ts`

**Change:** Fix `invokeAgent` to check thread existence instead of message count.

**File:** `server/src/routes/chat.ts` (optional)

**Add:** `GET /api/chat/:conversationId/history` endpoint for fallback.

### Phase 4: Auto-Title Generation

**File:** `src/components/chat/InterlocutorChat.tsx`

**Logic:**

- When first user message is sent, generate title from it
- Update conversation title in store
- Show in ConversationList

**Example:**

```typescript
// After first user message
if (messages.length === 1 && messages[0].role === 'user') {
  const title = messages[0].content.slice(0, 50) + '...';
  useConversationStore
    .getState()
    .updateConversationTitle(currentConversationId, title);
}
```

## Data Flow Examples

### Example 1: New Conversation

1. **User creates conversation:**
   - Frontend: `createConversation()` → generates ID, adds to store
   - Store: `{ id: "conv_123", title: "New Conversation", messages: [] }`

2. **User sends first message:**
   - Frontend: Sends `{ messages: [...], conversationId: "conv_123" }`
   - Backend: Receives, checks thread doesn't exist, passes all messages to agent
   - Backend: Checkpointer saves state with `thread_id: "conv_123"`
   - Frontend: Receives response, saves to store

3. **User sends second message:**
   - Frontend: Sends `{ messages: [msg1, msg2], conversationId: "conv_123" }`
   - Backend: Checks thread exists, only passes `msg2` to agent
   - Backend: Checkpointer loads history, agent has full context
   - Frontend: Receives response, updates store

### Example 2: Switch Conversation

1. **User clicks conversation in list:**
   - Frontend: Saves current conversation messages to store
   - Frontend: Sets `currentConversationId = "conv_456"`
   - Frontend: Loads messages from store for `conv_456`
   - Frontend: Resets `useChat` with `initialMessages`

2. **User sends message in new conversation:**
   - Frontend: Sends with `conversationId: "conv_456"`
   - Backend: Uses `thread_id: "conv_456"` for checkpointer
   - Backend: Checkpointer loads that thread's history
   - Flow continues normally

### Example 3: App Reload

1. **User reloads page:**
   - Zustand persistence: Automatically loads conversations from localStorage
   - Frontend: Gets `currentConversationId` from store
   - Frontend: Loads messages for current conversation from store
   - Frontend: Initializes `useChat` with those messages
   - **No backend call needed!**

2. **If messages missing (edge case):**
   - Frontend: Detects messages missing
   - Frontend: Optionally calls `GET /api/chat/:id/history`
   - Backend: Returns messages from checkpointer
   - Frontend: Saves to store

## Technical Considerations

### 1. LocalStorage Size Limits

**Limit:** ~5-10MB per domain

**Mitigation:**

- Store only recent messages (last 50-100) in localStorage
- Use IndexedDB for full history if needed
- Or: Only store metadata, fetch from backend when needed

**Recommendation:** Start simple, optimize later if needed.

### 2. Message Format Consistency

**Frontend (AI SDK):**

```typescript
{ role: 'user' | 'assistant', content: string, id?: string }
```

**Backend (LangChain):**

```typescript
HumanMessage | AIMessage | SystemMessage;
```

**Solution:** Frontend stores in AI SDK format (what it already has). Backend conversion only needed for optional history endpoint.

### 3. Conversation Deletion

**Frontend:**

- Remove from Zustand store
- Remove from localStorage (automatic via persistence)

**Backend:**

- Checkpointer state remains (not deleted)
- **Option A:** Leave it (orphaned, but harmless)
- **Option B:** Add delete endpoint to clean up checkpointer
- **Recommendation:** Option A for now, add Option B later if storage becomes issue

### 4. Error Handling

**Frontend:**

- If conversation switch fails: Show error, keep current conversation
- If messages fail to load: Show empty state, allow user to start fresh
- If store is corrupted: Reset to default, log error

**Backend:**

- If thread doesn't exist: Create new thread (current behavior)
- If checkpointer fails: Return error, frontend handles gracefully

## Benefits of This Approach

1. **Simpler Backend:**
   - No conversation list API needed
   - No metadata management
   - Just agent execution

2. **Better UX:**
   - Instant conversation switching (no API calls)
   - Works offline (messages in localStorage)
   - Full control over UI/UX

3. **Easier Development:**
   - All conversation logic in one place (Zustand)
   - Easy to add features (search, filtering, etc.)
   - No backend changes needed for most features

4. **Scalable:**
   - Can add IndexedDB later for large conversations
   - Can add backend sync later if needed
   - Can add backend APIs incrementally

## Migration Path

### Current State (Step 1 Complete)

- ✅ Conversation ID passing
- ✅ Zustand store with basic conversation management
- ✅ Backend accepts conversationId

### Next Steps

1. **Add message storage to Zustand** (Phase 1)
2. **Build ConversationList component** (Phase 2)
3. **Implement conversation switching** (Phase 2)
4. **Add auto-title generation** (Phase 4)
5. **Optional: Fix backend message handling** (Phase 3)
6. **Optional: Add history endpoint** (Phase 3)

## Summary

**Frontend owns:**

- Conversation list
- Conversation metadata
- Message history
- Conversation switching
- UI/UX

**Backend owns:**

- Agent execution
- Checkpointer thread management
- Optional: History loading (fallback only)

**Result:** Simple, fast, maintainable architecture with clear separation of concerns.
