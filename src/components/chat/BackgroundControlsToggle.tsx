/**
 * BackgroundControlsToggle.tsx — Toggle button that opens the background/visualization controls.
 *
 * Renders an inline IconButton only; the parent decides where it lives
 * (sidebar control strip in standard mode, fixed corner in terminal mode).
 *
 * @module components/chat/BackgroundControlsToggle
 */

import { IconButton } from '@chakra-ui/react';
import { LuSlidersHorizontal } from 'react-icons/lu';

interface BackgroundControlsToggleProps {
  readonly open: boolean;
  readonly onToggle: (open: boolean) => void;
}

export const BackgroundControlsToggle = ({
  open,
  onToggle,
}: BackgroundControlsToggleProps) => (
  <IconButton
    aria-label={open ? 'Hide background controls' : 'Show background controls'}
    size="sm"
    variant="ghost"
    colorPalette="gray"
    opacity={0.85}
    onClick={() => onToggle(!open)}
    bg={open ? 'rgba(255, 255, 255, 0.08)' : 'transparent'}
  >
    <LuSlidersHorizontal />
  </IconButton>
);
