/**
 * useConversationImport.ts — Conversation import flow with duplicate detection and progress state.
 *
 * @module components/chat/condensed/useConversationImpor
 */

import { toaster } from '@/components/ui/toaster';
import {
  importConversation,
  parseImportFile,
} from '@/lib/conversation-importer';
import { useConversationStore } from '@/lib/conversation-store';
import type { UIMessage } from 'ai';
import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
} from 'react';
import { checkForDuplicates, yieldToBrowser } from './conversationListUtils';

export type ImportData = ReturnType<typeof importConversation> & {
  duplicateMap?: Map<string, { conversationId: string; message: UIMessage }>;
};

export interface ImportProgressState {
  readonly isImporting: boolean;
  readonly currentStep: string;
  readonly progress: number;
  readonly totalSteps: number;
}

export interface UseConversationImportResult {
  readonly importProgress: ImportProgressState;
  pendingImport: {
    type: 'single' | 'multiple';
    single?: ImportData;
    multiple?: ImportData[];
    duplicateMap?: Map<string, { conversationId: string; message: UIMessage }>;
  } | null;
  readonly duplicateCount: number;
  readonly duplicateDialogOpen: boolean;
  readonly handleFileImport: (
    event: ChangeEvent<HTMLInputElement>
  ) => Promise<void>;
  readonly handleConfirmOverwrite: () => Promise<void>;
  readonly handleCancelOverwrite: () => void;
}

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

  // Import progress state
  const [importProgress, setImportProgress] = useState<ImportProgressState>({
    isImporting: false,
    currentStep: '',
    progress: 0,
    totalSteps: 100, // More granular steps
  });

  const handleFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset cancellation flag
    importCancelledRef.current = false;

    // Start import progress
    setImportProgress({
      isImporting: true,
      currentStep: 'Parsing file...',
      progress: 0,
      totalSteps: 100,
    });

    // Yield to browser to allow UI to update
    await yieldToBrowser();

    try {
      setImportProgress((prev) => ({
        ...prev,
        currentStep: 'Reading file contents...',
        progress: 5,
      }));
      await yieldToBrowser();

      const parsed = await parseImportFile(file);

      setImportProgress((prev) => ({
        ...prev,
        currentStep: 'File parsed successfully',
        progress: 10,
      }));

      if (importCancelledRef.current) {
        setImportProgress((prev) => ({ ...prev, isImporting: false }));
        return;
      }

      // Yield to browser to allow UI to update
      await yieldToBrowser();

      if (parsed.type === 'single') {
        // Create progress callback for granular updates
        const progressCallback = (
          step: string,
          current: number,
          total: number
        ) => {
          if (importCancelledRef.current) return;
          // Map progress to 10-80% range (parsing is 0-10%, processing is 10-80%)
          const progressPercent = 10 + Math.floor((current / total) * 70);
          setImportProgress((prev) => ({
            ...prev,
            currentStep: step,
            progress: progressPercent,
          }));
        };

        const { conversation, messages, conversationMessages } =
          importConversation(parsed.data, progressCallback);

        if (importCancelledRef.current) {
          setImportProgress((prev) => ({ ...prev, isImporting: false }));
          return;
        }

        setImportProgress((prev) => ({
          ...prev,
          currentStep: 'Checking for duplicates...',
          progress: 80,
        }));

        // Yield to browser to allow UI to update
        await yieldToBrowser();

        // Check for duplicate message IDs
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
          // Don't hide progress bar yet - wait for user decision
        } else {
          setImportProgress((prev) => ({
            ...prev,
            currentStep: 'Saving to storage...',
            progress: 4,
          }));

          // Yield to browser to allow UI to update
          await yieldToBrowser();

          if (importCancelledRef.current) {
            setImportProgress((prev) => ({ ...prev, isImporting: false }));
            return;
          }

          // No duplicates, proceed with import
          try {
            importConversationToStore(
              conversation,
              messages,
              conversationMessages
            );

            setImportProgress({
              isImporting: false,
              currentStep: 'Complete!',
              progress: 100,
              totalSteps: 100,
            });

            // Hide progress bar after a delay
            setTimeout(() => {
              setImportProgress((prev) => ({ ...prev, isImporting: false }));
            }, 1500);

            toaster.create({
              title: 'Conversation imported',
              description: `"${conversation.title}" has been imported successfully.`,
              type: 'success',
              duration: 3000,
              meta: { closable: true },
            });
          } catch (error) {
            console.error('Import storage error:', error);

            setImportProgress({
              isImporting: false,
              currentStep: 'Complete with warnings',
              progress: 4,
              totalSteps: 4,
            });

            setTimeout(() => {
              setImportProgress((prev) => ({ ...prev, isImporting: false }));
            }, 2000);

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
        // For multiple conversations, process each with progress
        const multipleConversations = parsed.data;
        const totalConversations = multipleConversations.length;

        const imported = multipleConversations.map((conv, convIndex) => {
          const progressCallback = (
            step: string,
            current: number,
            total: number
          ) => {
            if (importCancelledRef.current) return;
            // Map progress: 10% base + (conversation progress * 70% / total conversations)
            const conversationProgress = (convIndex / totalConversations) * 70;
            const messageProgress =
              (current / total) * (70 / totalConversations);
            const progressPercent =
              10 + Math.floor(conversationProgress + messageProgress);
            setImportProgress((prev) => ({
              ...prev,
              currentStep: `Processing conversation ${convIndex + 1}/${totalConversations}: ${step}`,
              progress: progressPercent,
            }));
          };

          return importConversation(conv, progressCallback);
        });

        if (importCancelledRef.current) {
          setImportProgress((prev) => ({ ...prev, isImporting: false }));
          return;
        }

        setImportProgress((prev) => ({
          ...prev,
          currentStep: 'Checking for duplicates...',
          progress: 80,
        }));

        // Yield to browser to allow UI to update
        await yieldToBrowser();

        // Check for duplicates across all imported conversations
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
          // Store pending import and show dialog
          setPendingImport({
            type: 'multiple',
            multiple: imported,
            duplicateMap,
          });
          setDuplicateCount(count);
          setDuplicateDialogOpen(true);
          // Don't hide progress bar yet - wait for user decision
        } else {
          setImportProgress((prev) => ({
            ...prev,
            currentStep: 'Saving to storage...',
            progress: 4,
          }));

          // Yield to browser to allow UI to update
          await yieldToBrowser();

          if (importCancelledRef.current) {
            setImportProgress((prev) => ({ ...prev, isImporting: false }));
            return;
          }

          // No duplicates, proceed with import
          try {
            importConversationsToStore(imported);

            setImportProgress({
              isImporting: false,
              currentStep: 'Complete!',
              progress: 100,
              totalSteps: 100,
            });

            // Hide progress bar after a delay
            setTimeout(() => {
              setImportProgress((prev) => ({ ...prev, isImporting: false }));
            }, 1500);

            toaster.create({
              title: 'Conversations imported',
              description: `${imported.length} conversations have been imported successfully.`,
              type: 'success',
              duration: 3000,
              meta: { closable: true },
            });
          } catch (error) {
            console.error('Import storage error:', error);

            setImportProgress({
              isImporting: false,
              currentStep: 'Complete with warnings',
              progress: 4,
              totalSteps: 4,
            });

            setTimeout(() => {
              setImportProgress((prev) => ({ ...prev, isImporting: false }));
            }, 2000);

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

      setImportProgress({
        isImporting: false,
        currentStep: 'Failed',
        progress: 0,
        totalSteps: 4,
      });

      setTimeout(() => {
        setImportProgress((prev) => ({ ...prev, isImporting: false }));
      }, 2000);

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
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmOverwrite = async () => {
    if (!pendingImport) return;

    // Reset cancellation flag
    importCancelledRef.current = false;

    setImportProgress((prev) => ({
      ...prev,
      currentStep: 'Saving to storage...',
      progress: 4,
    }));

    // Yield to browser to allow UI to update
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

    setImportProgress({
      isImporting: false,
      currentStep: 'Complete!',
      progress: 4,
      totalSteps: 4,
    });

    setTimeout(() => {
      setImportProgress((prev) => ({ ...prev, isImporting: false }));
    }, 1500);

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
