/**
 * BackgroundControlsToggle.tsx — Toggle button that opens the background/visualization controls.
 *
 * @module components/chat/BackgroundControlsToggle
 */

import { HStack, IconButton } from '@chakra-ui/react';
import { LuSlidersHorizontal } from 'react-icons/lu';

interface BackgroundControlsToggleProps {
  readonly open: boolean;
  readonly onToggle: (open: boolean) => void;
}

export const BackgroundControlsToggle = ({
  open,
  onToggle,
}: BackgroundControlsToggleProps) => (
  <HStack position="fixed" top={3} left={3} zIndex={20} gap={1} align="center">
    <IconButton
      aria-label={
        open ? 'Hide background controls' : 'Show background controls'
      }
      size="sm"
      variant="ghost"
      colorPalette="gray"
      opacity={0.85}
      onClick={() => onToggle(!open)}
      bg={open ? 'rgba(255, 255, 255, 0.08)' : 'transparent'}
    >
      <LuSlidersHorizontal />
    </IconButton>
  </HStack>
);
