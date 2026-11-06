// Static CSS style objects for chat components
// These are truly static and don't depend on props or state

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

export const textShadowStyles = {
  textShadow: '0 0 4px rgba(255, 255, 255, 0.08)',
};

export const demoMenuItemStyles = {
  textShadow: '0 0 4px rgba(255, 255, 255, 0.08)',
};

export const stopMenuItemStyles = {
  textShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
};

export const cyanTextShadowStyles = {
  textShadow: '0 0 4px rgba(34, 211, 238, 0.5)',
};

export const grayTextShadowStyles = {
  textShadow: '0 0 2px rgba(255, 255, 255, 0.1)',
};

export const emeraldTextShadowStyles = {
  textShadow: '0 0 4px rgba(16, 185, 129, 0.5)',
};

export const yellowTextShadowStyles = {
  textShadow: '0 0 4px rgba(250, 204, 21, 0.5)',
};

export const redTextShadowStyles = {
  textShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
};

export const emeraldGlowStyles = {
  textShadow:
    '0 0 8px rgba(16, 185, 129, 0.5), 0 0 16px rgba(16, 185, 129, 0.3)',
};

export const headerTextShadowStyles = {
  textShadow: '0 0 4px rgba(255, 255, 255, 0.1)',
};

export const separatorTextShadowStyles = {
  textShadow: '0 0 4px rgba(255, 255, 255, 0.05)',
};

export const promptCharStyles = {
  textShadow: '0 0 4px rgba(34, 211, 238, 0.5)',
};

export const inputStyles = {
  textShadow:
    '0 0 4px rgba(255, 255, 255, 0.08), 0 0 8px rgba(255, 255, 255, 0.04)',
  caretColor: 'transparent', // Hide native caret
  '&::selection': {
    bg: 'rgba(255, 255, 255, 0.2)',
  },
};

export const cursorBlinkStyles = {
  animation: 'blink 1s step-end infinite',
  '@keyframes blink': {
    '0%, 50%': { opacity: 1 },
    '51%, 100%': { opacity: 0 },
  },
  pointerEvents: 'none',
};
