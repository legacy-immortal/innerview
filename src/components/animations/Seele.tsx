import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { useMemo } from 'react';

export interface SeeleBackgroundSettings {
  textColor?: string;
  bgColor?: string;
  topText?: string;
  bottomText?: string;
  fontFamily?: string;
  numberSize?: number;
  labelSize?: number;
  pulseSpeed?: number;
  pulseIntensity?: number;
  scanlineSpeed?: number;
  scanlineOpacity?: number;
  scanlineColor?: string;
  showNumber?: boolean;
  seeleNumber?: number;
}

/** Sans-serif font options for SEELE display (value is CSS font-family). */
export const SEELE_FONT_OPTIONS: { value: string; label: string }[] = [
  { value: 'Inter, system-ui, sans-serif', label: 'Inter' },
  { value: 'Roboto, system-ui, sans-serif', label: 'Roboto' },
  { value: '"Open Sans", system-ui, sans-serif', label: 'Open Sans' },
  { value: '"Segoe UI", system-ui, sans-serif', label: 'Segoe UI' },
  { value: 'Arial, Helvetica, sans-serif', label: 'Arial' },
  { value: '"Source Sans 3", system-ui, sans-serif', label: 'Source Sans 3' },
  {
    value: 'Consolas, "Courier New", monospace',
    label: 'Consolas (monospace)',
  },
];

export const SEELE_DEFAULT_TOP_TEXT = 'SEELE';
export const SEELE_DEFAULT_BOTTOM_TEXT = 'SOUND ONLY';

const SEELE_DEFAULT_FONT = 'Inter, system-ui, sans-serif';

const DEFAULT_SETTINGS: SeeleBackgroundSettings = {
  textColor: '#ff0000',
  bgColor: '#000000',
  topText: SEELE_DEFAULT_TOP_TEXT,
  bottomText: SEELE_DEFAULT_BOTTOM_TEXT,
  fontFamily: SEELE_DEFAULT_FONT,
  numberSize: 120,
  labelSize: 32,
  pulseSpeed: 2,
  pulseIntensity: 0.1,
  scanlineSpeed: 3,
  scanlineOpacity: 0.3,
  scanlineColor: '#ff0000',
  showNumber: true,
  seeleNumber: 1,
};

interface SeeleProps {
  settings?: Partial<SeeleBackgroundSettings>;
}

export default function Seele({ settings }: SeeleProps) {
  const mergedSettings = useMemo(() => {
    const cleanedSettings = settings
      ? Object.fromEntries(
          Object.entries(settings).filter(([_, value]) => value !== undefined)
        )
      : {};
    return { ...DEFAULT_SETTINGS, ...cleanedSettings };
  }, [settings]);

  const pulseIntensity = mergedSettings.pulseIntensity ?? 0.1;
  const scanlineSpeed = mergedSettings.scanlineSpeed ?? 3;
  const scanlineOpacity = mergedSettings.scanlineOpacity ?? 0.3;
  const scanlineColor =
    mergedSettings.scanlineColor ?? mergedSettings.textColor ?? '#ff0000';
  const numberSize = mergedSettings.numberSize ?? 120;
  const labelSize = mergedSettings.labelSize ?? 32;
  const seeleNumber = mergedSettings.seeleNumber ?? 1;
  const numberStr = String(seeleNumber).padStart(2, '0');
  const firstDigit = numberStr[0];
  const secondDigit = numberStr[1];

  // Convert hex color to rgba for glow effect
  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const textColor = mergedSettings.textColor ?? '#ff0000';
  const glowColor1 = hexToRgba(textColor, 1);
  const glowColor2 = hexToRgba(textColor, 0.4);
  const glowColor3 = hexToRgba(textColor, 0.2);
  const scanlineRgba = hexToRgba(scanlineColor, scanlineOpacity);

  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      width="100%"
      height="100%"
      bg={mergedSettings.bgColor}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      fontFamily={mergedSettings.fontFamily ?? SEELE_DEFAULT_FONT}
      overflow="hidden"
      css={{
        '@keyframes pulse': {
          '0%, 100%': {
            opacity: 1,
          },
          '50%': {
            opacity: 1 - pulseIntensity,
          },
        },
        '@keyframes scanline': {
          '0%': {
            top: '-2px',
          },
          '100%': {
            top: '100%',
          },
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-2px',
          left: 0,
          right: 0,
          width: '100%',
          height: '2px',
          background: `linear-gradient(
            to bottom,
            transparent 0%,
            ${scanlineRgba} 50%,
            transparent 100%
          )`,
          animation: `scanline ${scanlineSpeed}s linear infinite`,
          pointerEvents: 'none',
          zIndex: 1,
          willChange: 'top',
        },
      }}
    >
      <VStack
        gap={8}
        align="center"
        justify="center"
        position="relative"
        zIndex={2}
        css={{
          animation: 'pulse 2s ease-in-out infinite',
        }}
      >
        <Text
          fontSize={`${labelSize}px`}
          color={mergedSettings.textColor}
          fontWeight="bold"
          textTransform="uppercase"
          letterSpacing="0.1em"
          textAlign="center"
          css={{
            textShadow: `0 0 ${labelSize * 0.5}px ${glowColor1}, 0 0 ${labelSize}px ${glowColor2}, 0 0 ${labelSize * 1.5}px ${glowColor3}`,
          }}
        >
          {mergedSettings.topText ?? SEELE_DEFAULT_TOP_TEXT}
        </Text>

        {mergedSettings.showNumber && (
          <HStack gap={4} align="center" justify="center">
            <Box
              position="relative"
              fontSize={`${numberSize}px`}
              color={mergedSettings.textColor}
              fontWeight="bold"
              lineHeight={1}
              fontFamily="inherit"
              css={{
                textShadow: `0 0 ${numberSize * 0.5}px ${glowColor1}, 0 0 ${numberSize}px ${glowColor2}, 0 0 ${numberSize * 1.5}px ${glowColor3}`,
                ...(firstDigit === '0'
                  ? {
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: '120%',
                        height: '8px',
                        background: textColor,
                        transform: 'translate(-50%, -50%) rotate(-45deg)',
                        transformOrigin: 'center',
                        boxShadow: `0 0 ${numberSize * 0.3}px ${hexToRgba(textColor, 0.6)}`,
                      },
                    }
                  : {}),
              }}
            >
              {firstDigit}
            </Box>
            <Text
              fontSize={`${numberSize}px`}
              color={mergedSettings.textColor}
              fontWeight="bold"
              lineHeight={1}
              fontFamily="inherit"
              css={{
                textShadow: `0 0 ${numberSize * 0.5}px ${glowColor1}, 0 0 ${numberSize}px ${glowColor2}, 0 0 ${numberSize * 1.5}px ${glowColor3}`,
              }}
            >
              {secondDigit}
            </Text>
          </HStack>
        )}

        <Text
          fontSize={`${labelSize}px`}
          color={mergedSettings.textColor}
          fontWeight="bold"
          textTransform="uppercase"
          letterSpacing="0.1em"
          textAlign="center"
          css={{
            textShadow: `0 0 ${labelSize * 0.5}px ${glowColor1}, 0 0 ${labelSize}px ${glowColor2}, 0 0 ${labelSize * 1.5}px ${glowColor3}`,
          }}
        >
          {mergedSettings.bottomText ?? SEELE_DEFAULT_BOTTOM_TEXT}
        </Text>
      </VStack>
    </Box>
  );
}
