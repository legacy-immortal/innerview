import { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  HStack,
  Portal,
  Text,
  VStack,
} from '@chakra-ui/react';

interface DisclaimerDialogProps {
  onAccept: () => void;
  onReject: () => void;
}

/**
 * Standalone disclaimer alert modal.
 *
 * Step 1 of bootstrap: the disclaimer is announced on its own, separate from
 * the prelaunch loader checklist and the capabilities dialog. Accepting
 * starts device detection; rejecting shows the offline view.
 */
export function DisclaimerDialog({
  onAccept,
  onReject,
}: DisclaimerDialogProps) {
  const [readDisclaimer, setReadDisclaimer] = useState(false);

  return (
    <Dialog.Root
      open
      onOpenChange={(details) => {
        if (!details.open) return;
      }}
      closeOnEscape={false}
      closeOnInteractOutside={false}
      role="alertdialog"
      aria-modal="true"
      aria-label="Disclaimer"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            maxW="480px"
            bg="rgba(0, 0, 0, 0.95)"
            border="1px solid"
            borderColor="rgba(255, 255, 255, 0.1)"
            fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
          >
            <Dialog.Header>
              <Dialog.Title color="white" fontSize="md" letterSpacing="0.05em">
                Disclaimer
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4} align="stretch">
                <Text color="gray.400" fontSize="sm" lineHeight="tall">
                  The assistant is an artificial intelligence. Its answers may
                  be incorrect or unreliable. Conversations are stored locally
                  and are ephemeral. This application is an experiment for
                  entertainment purposes only.
                </Text>

                <Checkbox.Root
                  checked={readDisclaimer}
                  onCheckedChange={(e) => setReadDisclaimer(e.checked === true)}
                  colorPalette="emerald"
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label color="gray.300" fontSize="sm">
                    I have read the disclaimer
                  </Checkbox.Label>
                </Checkbox.Root>

                <HStack gap={3} justify="flex-end" w="full" pt={2}>
                  <Button
                    size="sm"
                    variant="outline"
                    colorPalette="red"
                    onClick={onReject}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    colorPalette="emerald"
                    disabled={!readDisclaimer}
                    onClick={onAccept}
                  >
                    Accept
                  </Button>
                </HStack>
                <Box>
                  <Text color="gray.600" fontSize="xs">
                    Accepting starts the prelaunch system check.
                  </Text>
                </Box>
              </VStack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
