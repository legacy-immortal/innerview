/**
 * @file useConversationImport.ts — Conversation import flow with duplicate detection and progress state.
 * @module components/chat/condensed/useConversationImport
 *
 * Conversation import flow with duplicate detection and progress state. Parses and
 * converts import files in a Web Worker (non-blocking) with real progress updates,
 * streaming each converted conversation back incrementally to reduce memory pressure.
 * Checks for duplicate message IDs and either imports directly or presents a pending
 * overwrite dialog. Saving and duplicate checks run on the main thread with yielding
 * to keep the UI responsive. Consumed by `ConversationList`.
 */

import { toaster } from '@/components/ui/toaster';
import { useConversationStore } from '@/lib/conversation-store';
import type {
  Conversation,
  ConversationMessage,
} from '@/lib/conversation-store';
import type { UIMessage } from 'ai';
import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
} from 'react';
import { checkForDuplicates, yieldToBrowser } from './conversationListUtils';

export interface ImportData {
  conversation: Conversation;
  messages: UIMessage[];
  conversationMessages?: ConversationMessage[];
  duplicateMap?: Map<string, { conversationId: string; message: UIMessage }>;
}

export interface ImportProgressState {
  readonly isImporting: boolean;
  readonly currentStep: string;
  readonly progress: number;
  readonly totalSteps: number;
}

export interface UseConversationImportResult {
  readonly importProgress: ImportProgressState;
  readonly pendingImport: {
    readonly type: 'single' | 'multiple';
    readonly single?: ImportData;
    readonly multiple?: ImportData[];
    readonly duplicateMap?: Map<
      string,
      { conversationId: string; message: UIMessage }
    >;
  } | null;
  readonly duplicateCount: number;
  readonly duplicateDialogOpen: boolean;
  readonly handleFileImport: (
    event: ChangeEvent<HTMLInputElement>
  ) => Promise<void>;
  readonly handleConfirmOverwrite: () => Promise<void>;
  readonly handleCancelOverwrite: () => void;
}

type WorkerConverted =
  | { type: 'single'; data: ImportData }
  | { type: 'multiple'; data: ImportData[] };

interface WorkerProgressMessage {
  type: 'progress';
  id: number;
  step: string;
  progress: number;
}
interface WorkerItemMessage {
  type: 'item';
  id: number;
  index: number;
  data: ImportData;
}
interface WorkerDoneMessage {
  type: 'done';
  id: number;
  kind: 'single' | 'multiple';
  count: number;
}
interface WorkerErrorMessage {
  type: 'error';
  id: number;
  error: string;
}
type WorkerMessage =
  | WorkerProgressMessage
  | WorkerItemMessage
  | WorkerDoneMessage
  | WorkerErrorMessage;

/**
 * Parse and convert an import file in a Web Worker, reporting progress to `onProgress`.
 * Receives converted conversations incrementally (one item per conversation) to
 * reduce peak memory pressure in the worker at finalization.
 */
function processImportInWorker(
  text: string,
  onProgress: (step: string, progress: number) => void
): Promise<WorkerConverted> {
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(
        new URL('../../../lib/conversation-import-worker.ts', import.meta.url),
        { type: 'module' }
      );
    } catch (err) {
      reject(
        err instanceof Error ? err : new Error('Failed to start import worker')
      );
      return;
    }

    const id = Date.now() + Math.floor(Math.random() * 1000);
    const items: ImportData[] = [];
    let kind: 'single' | 'multiple' | null = null;
    let settled = false;

    const cleanup = () => {
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
    };

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const msg = event.data;
      if (!msg || msg.id !== id || settled) return;

      if (msg.type === 'progress') {
        onProgress(msg.step, msg.progress);
        return;
      }
      if (msg.type === 'item') {
        // Collect each converted conversation as it streams in.
        items[msg.index] = msg.data;
        return;
      }
      if (msg.type === 'done') {
        kind = msg.kind;
        const compact = items.filter((x): x is ImportData => x != null);
        settled = true;
        cleanup();
        if (kind === 'single') {
          const data = compact[0];
          if (!data) {
            reject(new Error('Import produced no conversation data'));
            return;
          }
          resolve({ type: 'single', data });
        } else {
          resolve({ type: 'multiple', data: compact });
        }
        return;
      }
      if (msg.type === 'error') {
        fail(new Error(msg.error));
      }
    };

    worker.onerror = (event) => {
      fail(new Error(event.message || 'Import worker failed'));
    };

    worker.postMessage({ id, text });
  });
}

/**
 * Conversation import flow with duplicate detection and progress state.
 *
 * @param fileInputRef - Ref to the hidden file input used to select import files.
 * @returns Import result state and handlers.
 */
export const useConversationImport = (
  fileInputRef: RefObject<HTMLInputElement | null>
): UseConversationImportResult => {
  const conversations = useConversationStore((state) => state.conversations);
  const importConversationToStore = useConversationStore(
    (state) => state.importConversation
  );
  const importConversationsToStore = useConversationStore(
    (state) => state.importConversations
  );
  const loadConversationMessages = useConversationStore(
    (state) => state.loadConversationMessages
  );
  const saveConversationMessages = useConversationStore(
    (state) => state.saveConversationMessages
  );

  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const importCancelledRef = useRef(false);
  const [pendingImport, setPendingImport] = useState<{
    type: 'single' | 'multiple';
    single?: ImportData;
    multiple?: ImportData[];
    duplicateMap?: Map<string, { conversationId: string; message: UIMessage }>;
  } | null>(null);
  const [duplicateCount, setDuplicateCount] = useState(0);

  // Import progress state (0-100 scale for UI bar)
  const [importProgress, setImportProgress] = useState<ImportProgressState>({
    isImporting: false,
    currentStep: '',
    progress: 0,
    totalSteps: 100,
  });

  const setProgress = useCallback((step: string, progress: number) => {
    setImportProgress({
      isImporting: true,
      currentStep: step,
      progress: Math.max(0, Math.min(100, progress)),
      totalSteps: 100,
    });
  }, []);

  const finishProgress = useCallback(
    (step: string, progress: number, hideAfterMs = 1500) => {
      setImportProgress({
        isImporting: false,
        currentStep: step,
        progress,
        totalSteps: 100,
      });
      setTimeout(() => {
        setImportProgress((prev) => ({ ...prev, isImporting: false }));
      }, hideAfterMs);
    },
    []
  );

  const handleFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset cancellation flag
    importCancelledRef.current = false;

    setProgress('Reading file...', 1);
    await yieldToBrowser();

    try {
      // Read file text asynchronously (non-blocking I/O).
      const text = await file.text();
      if (importCancelledRef.current) {
        setImportProgress((prev) => ({ ...prev, isImporting: false }));
        return;
      }

      setProgress('Parsing and converting...', 3);
      await yieldToBrowser();

      // Parse and convert off the main thread in a worker, streaming results
      // per conversation to avoid a single large handoff at the end.
      const parsed = await processImportInWorker(text, (step, progress) => {
        if (importCancelledRef.current) return;
        setImportProgress((prev) => ({
          ...prev,
          isImporting: true,
          currentStep: step,
          progress: Math.max(prev.progress, Math.min(92, progress)),
          totalSteps: 100,
        }));
      });

      if (importCancelledRef.current) {
        setImportProgress((prev) => ({ ...prev, isImporting: false }));
        return;
      }

      if (parsed.type === 'single') {
        const { conversation, messages, conversationMessages } = parsed.data;

        setProgress('Checking for duplicates...', 94);
        await yieldToBrowser();

        if (importCancelledRef.current) {
          setImportProgress((prev) => ({ ...prev, isImporting: false }));
          return;
        }

        const { hasDuplicates, count, duplicateMap } = checkForDuplicates(
          conversations,
          loadConversationMessages,
          messages
        );

        if (importCancelledRef.current) {
          setImportProgress((prev) => ({ ...prev, isImporting: false }));
          return;
        }

        if (hasDuplicates) {
          // Store pending import and show dialog
          setPendingImport({
            type: 'single',
            single: {
              conversation,
              messages,
              conversationMessages,
              duplicateMap,
            },
          });
          setDuplicateCount(count);
          setDuplicateDialogOpen(true);
          // Keep progress visible at decision point until user acts.
          setProgress('Duplicates found — awaiting confirmation...', 96);
        } else {
          setProgress('Saving...', 97);
          await yieldToBrowser();

          if (importCancelledRef.current) {
            setImportProgress((prev) => ({ ...prev, isImporting: false }));
            return;
          }

          try {
            importConversationToStore(
              conversation,
              messages,
              conversationMessages
            );

            finishProgress('Complete', 100, 1500);
            toaster.create({
              title: 'Conversation imported',
              description: `"${conversation.title}" has been imported successfully.`,
              type: 'success',
              duration: 3000,
              meta: { closable: true },
            });
          } catch (error) {
            console.error('Import storage error:', error);
            finishProgress('Complete with warnings', 100, 2000);
            toaster.create({
              title: 'Import partially failed',
              description:
                'Conversation was imported but storage limits may have been exceeded. Some data may have been truncated.',
              type: 'warning',
              duration: 5000,
              meta: { closable: true },
            });
          }
        }
      } else {
        const imported = parsed.data;

        setProgress('Checking for duplicates...', 94);
        await yieldToBrowser();

        if (importCancelledRef.current) {
          setImportProgress((prev) => ({ ...prev, isImporting: false }));
          return;
        }

        const allIncomingMessages = imported.flatMap((imp) => imp.messages);
        const { hasDuplicates, count, duplicateMap } = checkForDuplicates(
          conversations,
          loadConversationMessages,
          allIncomingMessages
        );

        if (importCancelledRef.current) {
          setImportProgress((prev) => ({ ...prev, isImporting: false }));
          return;
        }

        if (hasDuplicates) {
          setPendingImport({
            type: 'multiple',
            multiple: imported,
            duplicateMap,
          });
          setDuplicateCount(count);
          setDuplicateDialogOpen(true);
          setProgress('Duplicates found — awaiting confirmation...', 96);
        } else {
          setProgress('Saving...', 97);
          await yieldToBrowser();

          if (importCancelledRef.current) {
            setImportProgress((prev) => ({ ...prev, isImporting: false }));
            return;
          }

          try {
            importConversationsToStore(imported);

            finishProgress('Complete', 100, 1500);
            toaster.create({
              title: 'Conversations imported',
              description: `${imported.length} conversations have been imported successfully.`,
              type: 'success',
              duration: 3000,
              meta: { closable: true },
            });
          } catch (error) {
            console.error('Import storage error:', error);
            finishProgress('Complete with warnings', 100, 2000);
            toaster.create({
              title: 'Import partially failed',
              description:
                'Conversations were imported but storage limits may have been exceeded. Some data may have been truncated.',
              type: 'warning',
              duration: 5000,
              meta: { closable: true },
            });
          }
        }
      }
    } catch (error) {
      if (importCancelledRef.current) {
        setImportProgress((prev) => ({ ...prev, isImporting: false }));
        return;
      }

      console.error('Import error:', error);
      finishProgress('Failed', 0, 2000);
      toaster.create({
        title: 'Import failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to import conversations',
        type: 'error',
        duration: 5000,
        meta: { closable: true },
      });
    } finally {
      // Reset file input so the same file can be selected again.
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmOverwrite = async () => {
    if (!pendingImport) return;

    // Reset cancellation flag
    importCancelledRef.current = false;

    setProgress('Applying duplicate overwrites...', 97);
    await yieldToBrowser();

    if (importCancelledRef.current) {
      setImportProgress((prev) => ({ ...prev, isImporting: false }));
      setDuplicateDialogOpen(false);
      setPendingImport(null);
      setDuplicateCount(0);
      return;
    }

    // First, overwrite existing messages with duplicate IDs in their conversations
    const duplicateMap =
      pendingImport.duplicateMap ||
      (pendingImport.type === 'single' && pendingImport.single?.duplicateMap
        ? pendingImport.single.duplicateMap
        : new Map());

    duplicateMap.forEach(({ conversationId, message: incomingMessage }) => {
      // Load existing messages for this conversation
      const existingMessages = loadConversationMessages(conversationId);
      if (existingMessages) {
        // Replace the message with the incoming one
        const updatedMessages = existingMessages.map((msg) => {
          if (msg.id === incomingMessage.id) {
            // Extract text content from incoming message parts
            const textParts = incomingMessage.parts?.filter(
              (p: { type?: string }) => p.type === 'text'
            ) as Array<{ text?: string }> | undefined;
            const content =
              textParts
                ?.map((p: { text?: string }) => p.text)
                .join(' ')
                .trim() || msg.content;

            return {
              ...msg,
              role: incomingMessage.role as 'user' | 'assistant' | 'system',
              content,
              parts: incomingMessage.parts as typeof msg.parts,
              updatedAt: new Date().toISOString(),
            };
          }
          return msg;
        });
        // Save updated messages back
        saveConversationMessages(conversationId, updatedMessages);
      }
    });

    if (importCancelledRef.current) {
      setImportProgress((prev) => ({ ...prev, isImporting: false }));
      setDuplicateDialogOpen(false);
      setPendingImport(null);
      setDuplicateCount(0);
      return;
    }

    setProgress('Saving...', 99);
    await yieldToBrowser();

    // Then proceed with normal import
    if (pendingImport.type === 'multiple' && pendingImport.multiple) {
      // Multiple conversation import
      importConversationsToStore(pendingImport.multiple);
      toaster.create({
        title: 'Conversations imported',
        description: `${pendingImport.multiple.length} conversations have been imported successfully. ${duplicateCount} duplicate message(s) were overwritten.`,
        type: 'success',
        duration: 3000,
        meta: { closable: true },
      });
    } else if (pendingImport.type === 'single' && pendingImport.single) {
      // Single conversation import
      importConversationToStore(
        pendingImport.single.conversation,
        pendingImport.single.messages,
        pendingImport.single.conversationMessages
      );
      toaster.create({
        title: 'Conversation imported',
        description: `"${pendingImport.single.conversation.title}" has been imported successfully. ${duplicateCount} duplicate message(s) were overwritten.`,
        type: 'success',
        duration: 3000,
        meta: { closable: true },
      });
    }

    finishProgress('Complete', 100, 1500);
    setDuplicateDialogOpen(false);
    setPendingImport(null);
    setDuplicateCount(0);
  };

  const handleCancelOverwrite = useCallback(() => {
    // Cancel the import
    importCancelledRef.current = true;
    setImportProgress((prev) => ({ ...prev, isImporting: false }));
    setDuplicateDialogOpen(false);
    setPendingImport(null);
    setDuplicateCount(0);
  }, []);

  return {
    importProgress,
    pendingImport,
    duplicateCount,
    duplicateDialogOpen,
    handleFileImport,
    handleConfirmOverwrite,
    handleCancelOverwrite,
  };
};
