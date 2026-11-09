/**
 * DuplicateImportDialog.tsx — Confirmation dialog shown when an import would duplicate messages.
 *
 * @module components/chat/condensed/DuplicateImportDialog
 */

import { Button, Dialog, Portal, Text, VStack } from '@chakra-ui/react';

interface DuplicateImportDialogProps {
  readonly open: boolean;
  readonly duplicateCount: number;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export const DuplicateImportDialog = ({
  open,
  duplicateCount,
  onCancel,
  onConfirm,
}: DuplicateImportDialogProps) => (
  <Dialog.Root
    open={open}
    onOpenChange={(e) => {
      // Only cancel if dialog is being closed (not opened)
      if (!e.open && open) {
        onCancel();
      }
    }}
    closeOnInteractOutside={false}
  >
    <Portal>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content
          maxW={{ base: 'calc(100vw - 2rem)', sm: '448px' }}
          maxH="90dvh"
          overflowY="auto"
        >
          <Dialog.Header>
            <Dialog.Title>Duplicate Message IDs Detected</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <VStack gap={4} align="stretch">
              <Text>
                Found {duplicateCount} message(s) with IDs that already exist in
                your conversations.
              </Text>
              <Text fontSize="sm" color="gray.400">
                If you proceed, the existing messages with matching IDs will be
                overwritten with the imported messages.
              </Text>
            </VStack>
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.ActionTrigger asChild>
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </Dialog.ActionTrigger>
            <Button colorPalette="orange" onClick={onConfirm}>
              Overwrite & Import
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Portal>
  </Dialog.Root>
);
