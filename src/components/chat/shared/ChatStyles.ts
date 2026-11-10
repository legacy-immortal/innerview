/**
 * @file ChatStyles.ts — Static Chakra style objects shared across the chat components.
 * @module components/chat/shared/ChatStyles
 *
 * Static Chakra style objects shared across the chat components. Truly static and independent
 * of props or state; includes scrollbar, text-shadow, input, and cursor-blink styles. Consumed
 * by message bubbles, context counter, and chat input.
 */

// Static CSS style objects for chat components
// These are truly static and don't depend on props or state

/** Scrollbar styling for the virtualized messages container. */
export const messagesContainerStyles = {
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '4px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.25)',
    },
  },
  '&::-webkit-scrollbar-corner': {
    background: 'transparent',
  },
  scrollbarWidth: 'thin',
  scrollbarColor: 'rgba(255, 255, 255, 0.15) transparent',
};

/** Subtle white text shadow used across chat text elements. */
export const textShadowStyles = {
  textShadow: '0 0 4px rgba(255, 255, 255, 0.08)',
};

/** Text shadow used by debug-menu items. */
export const demoMenuItemStyles = {
  textShadow: '0 0 4px rgba(255, 255, 255, 0.08)',
};

/** Red glowing text shadow used by the stop menu item. */
export const stopMenuItemStyles = {
  textShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
};

/** Cyan text shadow used by debug-menu hover states. */
export const cyanTextShadowStyles = {
  textShadow: '0 0 4px rgba(34, 211, 238, 0.5)',
};

/** Gray text shadow used by muted context-meter text. */
export const grayTextShadowStyles = {
  textShadow: '0 0 2px rgba(255, 255, 255, 0.1)',
};

/** Emerald text shadow used by speaking-state text. */
export const emeraldTextShadowStyles = {
  textShadow: '0 0 4px rgba(16, 185, 129, 0.5)',
};

/** Yellow text shadow used by purge-duplicates menu item. */
export const yellowTextShadowStyles = {
  textShadow: '0 0 4px rgba(250, 204, 21, 0.5)',
};

/** Red text shadow used by clear-all menu item. */
export const redTextShadowStyles = {
  textShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
};

/** Emerald double-glow text shadow used by the INTERLOCUTOR role label. */
export const emeraldGlowStyles = {
  textShadow:
    '0 0 8px rgba(16, 185, 129, 0.5), 0 0 16px rgba(16, 185, 129, 0.3)',
};

/** Header text shadow used by role labels and timestamps. */
export const headerTextShadowStyles = {
  textShadow: '0 0 4px rgba(255, 255, 255, 0.1)',
};

/** Separator text shadow used by the › glyph between header segments. */
export const separatorTextShadowStyles = {
  textShadow: '0 0 4px rgba(255, 255, 255, 0.05)',
};

/** Cyan text shadow used by the prompt char ($ / >) in ChatInput. */
export const promptCharStyles = {
  textShadow: '0 0 4px rgba(34, 211, 238, 0.5)',
};

/** Input styles: hidden native caret, subtle selection highlight, text shadow. */
export const inputStyles = {
  textShadow:
    '0 0 4px rgba(255, 255, 255, 0.08), 0 0 8px rgba(255, 255, 255, 0.04)',
  caretColor: 'transparent', // Hide native caret
  '&::selection': {
    bg: 'rgba(255, 255, 255, 0.2)',
  },
};

/** Blinking cursor animation for the synthetic caret in ChatInput. */
export const cursorBlinkStyles = {
  animation: 'blink 1s step-end infinite',
  '@keyframes blink': {
    '0%, 50%': { opacity: 1 },
    '51%, 100%': { opacity: 0 },
  },
  pointerEvents: 'none',
};
