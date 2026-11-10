import { Box } from '@chakra-ui/react';
import { ReactNode, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';

/**
 * @file TerminalTransition.tsx — terminal-style content transition with a
 * scanline sweep and fading prompt glyph.
 * @module components/animations/TerminalTransition
 *
 * Slides content up or down with a terminal scanline sweep and a fading
 * `>` prompt. The content stays mounted for the full transition in both
 * directions so the animation can complete before unmounting.
 */

/** Props for the terminal transition. */
interface TerminalTransitionProps {
  /** Child content to transition. */
  readonly children: ReactNode;
  /** Whether the content should be visible. */
  readonly isVisible: boolean;
  /** Slide direction: `'up'` slides out upward, `'down'` slides out downward. */
  readonly direction?: 'up' | 'down';
  /** Transition duration in milliseconds. */
  readonly duration?: number;
}

/**
 * Compute the Y translation for the transitioning content.
 * @param isAnimating - Whether the transition animation is running.
 * @param isVisible - Whether the content is being shown.
 * @param direction - Slide direction.
 * @returns The translateY value for the content.
 */
function resolveTranslateY(
  isAnimating: boolean,
  isVisible: boolean,
  direction: 'up' | 'down'
): string {
  if (!isAnimating) return '0%';
  if (isVisible) return '0%';
  return direction === 'up' ? '-100%' : '100%';
}

/**
 * Animate content in and out with a terminal scanline sweep.
 * @param props - Children, visibility, direction, and duration.
 * @returns The transition wrapper element, or null when fully hidden.
 */
export function TerminalTransition({
  children,
  isVisible,
  direction = 'up',
  duration = 400,
}: TerminalTransitionProps): ReactElement | null {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showContent, setShowContent] = useState(isVisible);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  useEffect(() => {
    if (isVisible !== showContent) {
      setIsAnimating(true);

      // Show content immediately when transitioning in
      if (isVisible) {
        setShowContent(true);
      }

      // Delay hiding content until animation completes; in both directions
      // the content stays mounted for the full transition.
      timeoutRef.current = setTimeout(() => {
        if (!isVisible) {
          setShowContent(false);
        }
        setIsAnimating(false);
      }, duration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible, showContent, duration]);

  if (!showContent && !isVisible) {
    return null;
  }

  const translateY = resolveTranslateY(isAnimating, isVisible, direction);

  const opacity = isAnimating && !isVisible ? 0 : 1;

  return (
    <Box
      position="relative"
      w="100%"
      h="100%"
      overflow="hidden"
      css={{
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: isAnimating
            ? `linear-gradient(
                to bottom,
                transparent 0%,
                rgba(16, 185, 129, 0.03) 50%,
                transparent 100%
              )`
            : 'transparent',
          backgroundSize: '100% 2px',
          animation: isAnimating ? `scanline ${duration}ms linear` : 'none',
          pointerEvents: 'none',
          zIndex: 10,
          '@keyframes scanline': {
            '0%': {
              transform: 'translateY(-100%)',
            },
            '100%': {
              transform: 'translateY(100vh)',
            },
          },
        },
        '&::after': isAnimating
          ? {
              content: '">"',
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontFamily:
                "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace",
              fontSize: 'xs',
              color: 'emerald.400',
              opacity: 0.6,
              textShadow: '0 0 8px rgba(16, 185, 129, 0.5)',
              animation: `promptFade ${duration}ms ease-in-out`,
              pointerEvents: 'none',
              zIndex: 11,
              '@keyframes promptFade': {
                '0%': {
                  opacity: 0,
                  transform: 'translate(-50%, -50%) scale(0.8)',
                },
                '20%': {
                  opacity: 0.6,
                  transform: 'translate(-50%, -50%) scale(1)',
                },
                '80%': {
                  opacity: 0.6,
                  transform: 'translate(-50%, -50%) scale(1)',
                },
                '100%': {
                  opacity: 0,
                  transform: 'translate(-50%, -50%) scale(0.8)',
                },
              },
            }
          : {},
      }}
    >
      <Box
        w="100%"
        h="100%"
        transform={`translateY(${translateY})`}
        opacity={opacity}
        transition={`transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${duration}ms ease-in-out`}
        css={{
          filter: isAnimating
            ? 'contrast(1.1) brightness(0.98)'
            : 'contrast(1) brightness(1)',
          transition: `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${duration}ms ease-in-out, filter ${duration}ms ease-in-out`,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
