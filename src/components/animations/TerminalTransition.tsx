import { Box } from '@chakra-ui/react';
import { ReactNode, useEffect, useRef, useState } from 'react';

interface TerminalTransitionProps {
  children: ReactNode;
  isVisible: boolean;
  direction?: 'up' | 'down';
  duration?: number;
}

export const TerminalTransition = ({
  children,
  isVisible,
  direction = 'up',
  duration = 400,
}: TerminalTransitionProps) => {
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

      // Delay hiding content until animation completes
      if (!isVisible) {
        timeoutRef.current = setTimeout(() => {
          setShowContent(false);
          setIsAnimating(false);
        }, duration);
      } else {
        timeoutRef.current = setTimeout(() => {
          setIsAnimating(false);
        }, duration);
      }
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

  const translateY = isAnimating
    ? direction === 'up'
      ? isVisible
        ? '0%'
        : '-100%'
      : isVisible
        ? '0%'
        : '100%'
    : '0%';

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
};
