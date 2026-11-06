// Chakra UI theme configuration with performance-aware variants
import { createSystem, defaultConfig } from '@chakra-ui/react';

// Terminal-styled switch recipe (80s/90s retro terminal aesthetic)
// Recipe structure for Switch component with slots (control and thumb)
// Matches the chunky, blocky aesthetic of TerminalProgressBar and TerminalLoader
const terminalSwitchRecipe = {
  base: {
    control: {
      bg: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 'none', // Sharp corners for retro terminal look
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.15s step-end', // Abrupt, chunky transitions
      // Grid overlay pattern for terminal aesthetic
      _before: {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 7px,
            rgba(255, 255, 255, 0.02) 7px,
            rgba(255, 255, 255, 0.02) 8px
          )
        `,
        pointerEvents: 'none',
        zIndex: 1,
      },
      _checked: {
        bg: 'emerald.400', // Terminal green for active state
        borderColor: 'emerald.300',
        boxShadow:
          '0 0 8px rgba(16, 185, 129, 0.5), 0 0 16px rgba(16, 185, 129, 0.3), inset 0 0 4px rgba(16, 185, 129, 0.2)',
      },
      _hover: {
        borderColor: 'rgba(255, 255, 255, 0.2)',
        _checked: {
          borderColor: 'emerald.200',
          boxShadow:
            '0 0 12px rgba(16, 185, 129, 0.6), 0 0 20px rgba(16, 185, 129, 0.4), inset 0 0 6px rgba(16, 185, 129, 0.3)',
        },
      },
      _focusVisible: {
        outline: '2px solid',
        outlineColor: 'emerald.400',
        outlineOffset: '2px',
        boxShadow:
          '0 0 8px rgba(16, 185, 129, 0.5), 0 0 0 2px rgba(16, 185, 129, 0.3)',
      },
      _disabled: {
        opacity: 0.4,
        cursor: 'not-allowed',
        filter: 'grayscale(0.5)',
      },
    },
    thumb: {
      bg: 'white',
      border: '1px solid',
      borderColor: 'rgba(255, 255, 255, 0.3)',
      borderRadius: 'none', // Sharp corners for retro look
      boxShadow:
        '0 1px 3px rgba(0, 0, 0, 0.4), 0 0 2px rgba(255, 255, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      transition: 'all 0.15s step-end', // Abrupt movement
      position: 'relative',
      zIndex: 2,
      // Chunky block effect
      _before: {
        content: '""',
        position: 'absolute',
        top: '1px',
        left: '1px',
        right: '1px',
        bottom: '1px',
        border: '1px solid',
        borderColor: 'rgba(0, 0, 0, 0.2)',
        pointerEvents: 'none',
      },
      _checked: {
        bg: 'white',
        borderColor: 'rgba(255, 255, 255, 0.4)',
        boxShadow:
          '0 2px 4px rgba(0, 0, 0, 0.5), 0 0 4px rgba(255, 255, 255, 0.3), 0 0 8px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
      },
    },
  },
  variants: {
    solid: {
      control: {
        bg: 'rgba(255, 255, 255, 0.05)',
        _checked: {
          bg: 'emerald.400',
        },
      },
    },
    raised: {
      control: {
        bg: 'rgba(255, 255, 255, 0.08)',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
        _checked: {
          bg: 'emerald.500',
          boxShadow:
            '0 2px 4px rgba(0, 0, 0, 0.4), 0 0 8px rgba(16, 185, 129, 0.4), inset 0 0 4px rgba(16, 185, 129, 0.2)',
        },
      },
    },
  },
  sizes: {
    xs: {
      control: {
        width: '32px',
        height: '18px',
      },
      thumb: {
        width: '14px',
        height: '14px',
      },
    },
    sm: {
      control: {
        width: '36px',
        height: '20px',
      },
      thumb: {
        width: '16px',
        height: '16px',
      },
    },
    md: {
      control: {
        width: '44px',
        height: '24px',
      },
      thumb: {
        width: '20px',
        height: '20px',
      },
    },
    lg: {
      control: {
        width: '52px',
        height: '28px',
      },
      thumb: {
        width: '24px',
        height: '24px',
      },
    },
  },
  // Note: defaultVariants removed - Switch component handles defaults internally
  // The recipe structure with slots (control, thumb) and variants (solid, raised)
  // and sizes (xs, sm, md, lg) is correct for Chakra UI's Switch component
};

// Slider: full width by default (root + control) for horizontal sliders
const defaultSlider = defaultConfig.theme?.recipes?.slider as
  | { base?: Record<string, Record<string, unknown>>; [key: string]: unknown }
  | undefined;
const defaultSliderBase = defaultSlider?.base ?? {};
const sliderFullWidthRecipe = {
  ...defaultConfig.theme?.recipes?.slider,
  base: {
    ...defaultSliderBase,
    root: { ...defaultSliderBase.root, width: '100%' },
    control: { ...defaultSliderBase.control, width: '100%' },
  },
};

// Low-resource theme configuration (minimal animations, reduced effects)
export const lowResourceTheme = createSystem({
  ...defaultConfig,
  theme: {
    ...defaultConfig.theme,
    tokens: {
      ...defaultConfig?.theme?.tokens,
    },
    recipes: {
      ...defaultConfig.theme?.recipes,
      switch: terminalSwitchRecipe,
      slider: sliderFullWidthRecipe,
    },
  },
  globalCss: {
    '*': {
      // Disable all animations and transitions for low-resource mode
      animation: 'none !important',
      transition: 'none !important',
      animationDuration: '0s !important',
      transitionDuration: '0s !important',
    },
    // Menu positioner - DO NOT override transform/position, floating-ui needs them
    '[data-part="positioner"][data-scope="menu"]': {
      animation: 'none !important',
      animationName: 'none !important',
      // DO NOT set transform: none - floating-ui uses transforms for positioning
    },
    '[data-part="positioner"][data-scope="menu"] > *': {
      animation: 'none !important',
      animationName: 'none !important',
      // DO NOT set transform: none - floating-ui uses transforms for positioning
    },
    // Keep only essential transitions for accessibility
    'button:focus-visible, a:focus-visible, input:focus-visible': {
      outline: '2px solid',
      outlineColor: 'blue.500',
      outlineOffset: '2px',
    },
    // Menu content styling - DO NOT override transform or position properties
    // NOTE: floating-ui needs transforms and position for proper menu positioning
    '[data-part="content"][data-scope="menu"]': {
      backdropFilter: 'blur(8px) !important',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3) !important',
      borderColor: 'rgba(255, 255, 255, 0.1) !important',
      fontFamily:
        "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace !important",
      fontSize: 'sm !important',
      // Kill animations but NOT transforms - floating-ui needs them
      animation: 'none !important',
      animationName: 'none !important',
      animationDuration: '0s !important',
      animationDelay: '0s !important',
      transformOrigin: 'top center !important',
      transition:
        'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important, filter 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important, border-color 0.3s ease-out 0.1s !important, box-shadow 0.3s ease-out 0.1s !important',
      transitionProperty:
        'opacity, filter, border-color, box-shadow !important',
    },
    '[data-part="content"]': {
      backdropFilter: 'blur(8px) !important',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3) !important',
      borderColor: 'rgba(255, 255, 255, 0.1) !important',
      fontFamily:
        "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace !important",
      fontSize: 'sm !important',
      animation: 'none !important',
      animationName: 'none !important',
      animationDuration: '0s !important',
      animationDelay: '0s !important',
      // DO NOT override transform or position properties - floating-ui needs them
      transformOrigin: 'top center !important',
      transition:
        'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important, filter 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important, border-color 0.3s ease-out 0.1s !important, box-shadow 0.3s ease-out 0.1s !important',
      transitionProperty:
        'opacity, filter, border-color, box-shadow !important',
    },
    '[data-part="positioner"] [data-part="content"]': {
      backdropFilter: 'blur(8px) !important',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3) !important',
      borderColor: 'rgba(255, 255, 255, 0.1) !important',
      fontFamily:
        "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace !important",
      fontSize: 'sm !important',
      animation: 'none !important',
      animationName: 'none !important',
      animationDuration: '0s !important',
      animationDelay: '0s !important',
      // DO NOT override transform or position properties - floating-ui needs them
      transformOrigin: 'top center !important',
      transition:
        'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important, filter 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important, border-color 0.3s ease-out 0.1s !important, box-shadow 0.3s ease-out 0.1s !important',
      transitionProperty:
        'opacity, filter, border-color, box-shadow !important',
    },
    // NUCLEAR: Override Presence wrapper animations
    '[data-part="content"][data-state="closed"]': {
      opacity: '0 !important',
      // NUCLEAR: Force vertical-only movement, zero horizontal/scale
      transform:
        'translateY(-8px) translateX(0) scale(1) rotate(0deg) !important',
      filter: 'brightness(0.3) contrast(1.2) !important',
      // NOTE: Do NOT override left/top - floating-ui needs these for positioning
    },
    '[data-part="content"][data-state="open"][data-scope="menu"]': {
      opacity: '1 !important',
      transform: 'translateY(0) translateX(0) scale(1) rotate(0deg) !important',
      filter: 'brightness(1) contrast(1) !important',
      borderColor: 'rgba(34, 211, 238, 0.4) !important',
      boxShadow:
        '0 4px 16px rgba(0, 0, 0, 0.3), 0 0 12px rgba(34, 211, 238, 0.15), inset 0 0 8px rgba(34, 211, 238, 0.08) !important',
      left: 'auto !important',
      top: 'auto !important',
    },
    '[data-part="positioner"] [data-part="content"][data-state="open"]': {
      opacity: '1 !important',
      transform: 'translateY(0) translateX(0) scale(1) rotate(0deg) !important',
      filter: 'brightness(1) contrast(1) !important',
      borderColor: 'rgba(34, 211, 238, 0.4) !important',
      boxShadow:
        '0 4px 16px rgba(0, 0, 0, 0.3), 0 0 12px rgba(34, 211, 238, 0.15), inset 0 0 8px rgba(34, 211, 238, 0.08) !important',
      left: 'auto !important',
      top: 'auto !important',
    },
    '[data-part="content"][data-state="closed"][data-scope="menu"]': {
      opacity: '0 !important',
      transform:
        'translateY(-8px) translateX(0) scale(1) rotate(0deg) !important',
      filter: 'brightness(0.3) contrast(1.2) !important',
      left: 'auto !important',
      top: 'auto !important',
    },
    '[data-part="content"][data-state="open"]': {
      opacity: '1 !important',
      // NUCLEAR: Force vertical-only movement, zero horizontal/scale
      transform: 'translateY(0) translateX(0) scale(1) rotate(0deg) !important',
      filter: 'brightness(1) contrast(1) !important',
      borderColor: 'rgba(34, 211, 238, 0.4) !important',
      boxShadow:
        '0 4px 16px rgba(0, 0, 0, 0.3), 0 0 12px rgba(34, 211, 238, 0.15), inset 0 0 8px rgba(34, 211, 238, 0.08) !important',
      // NOTE: Do NOT override left/top - floating-ui needs these for positioning
    },
    // Menu item hover/focus styles
    '[data-part="item"][data-scope="menu"]:hover': {
      bg: 'rgba(255, 255, 255, 0.05) !important',
      color: 'white !important',
    },
    '[data-part="item"][data-scope="menu"]:focus': {
      bg: 'rgba(255, 255, 255, 0.08) !important',
      color: 'white !important',
    },
  },
});

// Standard theme with reduced animations
export const standardTheme = createSystem({
  ...defaultConfig,
  theme: {
    ...defaultConfig.theme,
    recipes: {
      ...defaultConfig.theme?.recipes,
      switch: terminalSwitchRecipe,
      slider: sliderFullWidthRecipe,
    },
  },
  globalCss: {
    // Reduce animation durations for better performance
    '*': {
      animationDuration: '0.15s',
      transitionDuration: '0.15s',
    },
    // NUCLEAR OPTION: Maximum specificity CSS to kill all fly-in animations
    // Target Positioner first - this is the wrapper that might have animations
    '[data-part="positioner"]': {
      animation: 'none',
      animationName: 'none',
      transform: 'none',
      transition: 'none',
    },
    '[data-part="content"][data-scope="menu"]': {
      backdropFilter: 'blur(8px)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      fontFamily:
        "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace",
      fontSize: 'sm',
      animation: 'none',
      animationName: 'none',
      animationDuration: '0s',
      transform: 'none',
      transformOrigin: 'top center',
      transition:
        'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), filter 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s ease-out 0.1s, box-shadow 0.3s ease-out 0.1s',
    },
    '[data-part="content"]': {
      backdropFilter: 'blur(8px)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      fontFamily:
        "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace",
      fontSize: 'sm',
      animation: 'none',
      animationName: 'none',
      animationDuration: '0s',
      transform: 'none',
      transformOrigin: 'top center',
      transition:
        'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), filter 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s ease-out 0.1s, box-shadow 0.3s ease-out 0.1s',
    },
    '[data-part="positioner"] [data-part="content"]': {
      backdropFilter: 'blur(8px)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      fontFamily:
        "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace",
      fontSize: 'sm',
      animation: 'none',
      animationName: 'none',
      animationDuration: '0s',
      transform: 'none',
      transformOrigin: 'top center',
      transition:
        'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), filter 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s ease-out 0.1s, box-shadow 0.3s ease-out 0.1s',
    },
    // Override Presence wrapper animations
    '[data-part="content"][data-state="closed"]': {
      opacity: '0',
      transform: 'translateY(-8px) translateX(0) scale(1) rotate(0deg)',
      filter: 'brightness(0.3) contrast(1.2)',
    },
    '[data-part="content"][data-state="closed"][data-scope="menu"]': {
      opacity: '0',
      transform: 'translateY(-8px) translateX(0) scale(1) rotate(0deg)',
      filter: 'brightness(0.3) contrast(1.2)',
    },
    '[data-part="positioner"] [data-part="content"][data-state="closed"]': {
      opacity: '0',
      transform: 'translateY(-8px) translateX(0) scale(1) rotate(0deg)',
      filter: 'brightness(0.3) contrast(1.2)',
    },
    '[data-part="content"][data-state="open"]': {
      opacity: '1',
      transform: 'translateY(0) translateX(0) scale(1) rotate(0deg)',
      filter: 'brightness(1) contrast(1)',
      borderColor: 'rgba(34, 211, 238, 0.4)',
      boxShadow:
        '0 4px 16px rgba(0, 0, 0, 0.3), 0 0 12px rgba(34, 211, 238, 0.15), inset 0 0 8px rgba(34, 211, 238, 0.08)',
    },
    '[data-part="content"][data-state="open"][data-scope="menu"]': {
      opacity: '1',
      transform: 'translateY(0) translateX(0) scale(1) rotate(0deg)',
      filter: 'brightness(1) contrast(1)',
      borderColor: 'rgba(34, 211, 238, 0.4)',
      boxShadow:
        '0 4px 16px rgba(0, 0, 0, 0.3), 0 0 12px rgba(34, 211, 238, 0.15), inset 0 0 8px rgba(34, 211, 238, 0.08)',
    },
    '[data-part="positioner"] [data-part="content"][data-state="open"]': {
      opacity: '1',
      transform: 'translateY(0) translateX(0) scale(1) rotate(0deg)',
      filter: 'brightness(1) contrast(1)',
      borderColor: 'rgba(34, 211, 238, 0.4)',
      boxShadow:
        '0 4px 16px rgba(0, 0, 0, 0.3), 0 0 12px rgba(34, 211, 238, 0.15), inset 0 0 8px rgba(34, 211, 238, 0.08)',
    },
    // Menu item hover/focus styles
    '[data-part="item"][data-scope="menu"]:hover': {
      bg: 'rgba(255, 255, 255, 0.05)',
      color: 'white',
    },
    '[data-part="item"][data-scope="menu"]:focus': {
      bg: 'rgba(255, 255, 255, 0.08)',
      color: 'white',
    },
  },
});

// High-performance theme (full animations)
export const highPerformanceTheme = createSystem({
  ...defaultConfig,
  theme: {
    ...defaultConfig.theme,
    recipes: {
      ...defaultConfig.theme?.recipes,
      switch: terminalSwitchRecipe,
      slider: sliderFullWidthRecipe,
    },
  },
  globalCss: {
    // NUCLEAR OPTION: Maximum specificity CSS to kill all fly-in animations
    // Target Positioner first - this is the wrapper that might have animations
    '[data-part="positioner"]': {
      animation: 'none',
      animationName: 'none',
      transform: 'none',
      transition: 'none',
    },
    '[data-part="content"][data-scope="menu"]': {
      backdropFilter: 'blur(8px)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      fontFamily:
        "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace",
      fontSize: 'sm',
      animation: 'none',
      animationName: 'none',
      animationDuration: '0s',
      transform: 'none',
      transformOrigin: 'top center',
      transition:
        'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), filter 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s ease-out 0.1s, box-shadow 0.3s ease-out 0.1s',
    },
    '[data-part="content"]': {
      backdropFilter: 'blur(8px)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      fontFamily:
        "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace",
      fontSize: 'sm',
      animation: 'none',
      animationName: 'none',
      animationDuration: '0s',
      transform: 'none',
      transformOrigin: 'top center',
      transition:
        'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), filter 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s ease-out 0.1s, box-shadow 0.3s ease-out 0.1s',
    },
    '[data-part="positioner"] [data-part="content"]': {
      backdropFilter: 'blur(8px)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      fontFamily:
        "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace",
      fontSize: 'sm',
      animation: 'none',
      animationName: 'none',
      animationDuration: '0s',
      transform: 'none',
      transformOrigin: 'top center',
      transition:
        'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), filter 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s ease-out 0.1s, box-shadow 0.3s ease-out 0.1s',
    },
    // Override Presence wrapper animations
    '[data-part="content"][data-state="closed"]': {
      opacity: '0',
      transform: 'translateY(-8px) translateX(0) scale(1) rotate(0deg)',
      filter: 'brightness(0.3) contrast(1.2)',
    },
    '[data-part="content"][data-state="closed"][data-scope="menu"]': {
      opacity: '0',
      transform: 'translateY(-8px) translateX(0) scale(1) rotate(0deg)',
      filter: 'brightness(0.3) contrast(1.2)',
    },
    '[data-part="positioner"] [data-part="content"][data-state="closed"]': {
      opacity: '0',
      transform: 'translateY(-8px) translateX(0) scale(1) rotate(0deg)',
      filter: 'brightness(0.3) contrast(1.2)',
    },
    '[data-part="content"][data-state="open"]': {
      opacity: '1',
      transform: 'translateY(0) translateX(0) scale(1) rotate(0deg)',
      filter: 'brightness(1) contrast(1)',
      borderColor: 'rgba(34, 211, 238, 0.4)',
      boxShadow:
        '0 4px 16px rgba(0, 0, 0, 0.3), 0 0 12px rgba(34, 211, 238, 0.15), inset 0 0 8px rgba(34, 211, 238, 0.08)',
    },
    '[data-part="content"][data-state="open"][data-scope="menu"]': {
      opacity: '1',
      transform: 'translateY(0) translateX(0) scale(1) rotate(0deg)',
      filter: 'brightness(1) contrast(1)',
      borderColor: 'rgba(34, 211, 238, 0.4)',
      boxShadow:
        '0 4px 16px rgba(0, 0, 0, 0.3), 0 0 12px rgba(34, 211, 238, 0.15), inset 0 0 8px rgba(34, 211, 238, 0.08)',
    },
    '[data-part="positioner"] [data-part="content"][data-state="open"]': {
      opacity: '1',
      transform: 'translateY(0) translateX(0) scale(1) rotate(0deg)',
      filter: 'brightness(1) contrast(1)',
      borderColor: 'rgba(34, 211, 238, 0.4)',
      boxShadow:
        '0 4px 16px rgba(0, 0, 0, 0.3), 0 0 12px rgba(34, 211, 238, 0.15), inset 0 0 8px rgba(34, 211, 238, 0.08)',
    },
    // Menu item hover/focus styles
    '[data-part="item"][data-scope="menu"]:hover': {
      bg: 'rgba(255, 255, 255, 0.05)',
      color: 'white',
    },
    '[data-part="item"][data-scope="menu"]:focus': {
      bg: 'rgba(255, 255, 255, 0.08)',
      color: 'white',
    },
  },
});

// Get theme based on performance settings
export function getThemeForPerformance(
  chakraAnimationsEnabled: boolean,
  reducedMotion: boolean
) {
  if (!chakraAnimationsEnabled || reducedMotion) {
    return lowResourceTheme;
  }
  return standardTheme;
}
