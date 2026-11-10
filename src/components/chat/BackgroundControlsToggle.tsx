/**
 * @file BackgroundControlsToggle.tsx — Toggle button that opens the background/visualization controls.
 * @module components/chat/BackgroundControlsToggle
 *
 * Renders an inline IconButton only; the parent decides where it lives (sidebar control strip in
 * standard mode, fixed corner in terminal mode). Consumed by `StandardModeView` and
 * `TerminalModeView`.
 */

import type { JSX } from 'react';
import { IconButton } from '@chakra-ui/react';
import { LuSlidersHorizontal } from 'react-icons/lu';

/** Props for {@link BackgroundControlsToggle}. */
interface BackgroundControlsToggleProps {
  /** Whether the controls panel is currently open. */
  readonly open: boolean;
  /** Called with the next open state when the button is activated. */
  readonly onToggle: (open: boolean) => void;
}

/**
 * Renders the background-controls toggle button.
 *
 * @param props - Component props.
 * @returns The toggle icon button.
 */
export const BackgroundControlsToggle = ({
  open,
  onToggle,
}: BackgroundControlsToggleProps): JSX.Element => (
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
