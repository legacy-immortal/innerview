/**
 * @file Seele.tsx — pulsing SEELE number display with scanline overlay.
 * @module components/animations/Seele
 *
 * Renders the SEELE background animation: a pulsing two-digit number with
 * scanline and glow effects, plus top/bottom label text. Font options and
 * default texts are shared with `seeleConstants.ts` and re-exported from
 * this module so existing imports from `Seele` continue to resolve.
 */

import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { useMemo } from 'react';
import type { ReactElement } from 'react';
import {
  SEELE_DEFAULT_BOTTOM_TEXT,
  SEELE_DEFAULT_TOP_TEXT,
} from './seeleConstants';

export {
  SEELE_DEFAULT_BOTTOM_TEXT,
  SEELE_DEFAULT_TOP_TEXT,
  SEELE_FONT_OPTIONS,
} from './seeleConstants';

const SEELE_DEFAULT_FONT = 'Inter, system-ui, sans-serif';

/** Settings for the SEELE background animation. All fields are optional. */
export interface SeeleBackgroundSettings {
  /** Text color (CSS color string). */
  readonly textColor?: string;
  /** Background color (CSS color string). */
  readonly bgColor?: string;
  /** Top label text. */
  readonly topText?: string;
  /** Bottom label text. */
  readonly bottomText?: string;
  /** CSS font-family for all text. */
  readonly fontFamily?: string;
  /** Big number font size in px. */
  readonly numberSize?: number;
  /** Label font size in px. */
  readonly labelSize?: number;
  /** Pulse animation speed in seconds per cycle. */
  readonly pulseSpeed?: number;
  /** Pulse opacity swing depth. */
  readonly pulseIntensity?: number;
  /** Scanline animation speed in seconds per cycle. */
  readonly scanlineSpeed?: number;
  /** Scanline opacity. */
  readonly scanlineOpacity?: number;
  /** Scanline color (defaults to text color). */
  readonly scanlineColor?: string;
  /** Whether to show the two-digit number. */
  readonly showNumber?: boolean;
  /** The two-digit number to display (1–12). */
  readonly seeleNumber?: number;
}

/** Default SEELE settings, merged with any caller-supplied settings. */
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

/** Props for the SEELE background component. */
interface SeeleProps {
  /** Optional SEELE background settings (merged with defaults). */
  readonly settings?: Partial<SeeleBackgroundSettings>;
}

/**
 * Render the SEELE display with pulsing number and scanline overlay.
 * @param props - Optional SEELE background settings.
 * @returns The SEELE display element.
 */
export default function Seele({ settings }: SeeleProps): ReactElement {
  const mergedSettings = useMemo(() => {
    const cleanedSettings = settings
      ? Object.fromEntries(
          Object.entries(settings).filter(([_, value]) => value !== undefined)
        )
      : {};
    return { ...DEFAULT_SETTINGS, ...cleanedSettings };
  }, [settings]);

  const pulseIntensity = mergedSettings.pulseIntensity ?? 0.1;
  const pulseSpeed = mergedSettings.pulseSpeed ?? 2;
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

  // Convert a `#RRGGBB` hex color to an rgba string for the glow shadow.
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

  // @keyframes are injected as a raw <style> element: Chakra v3's css-prop
  // transform mangles '@keyframes' object values (it dropped the property
  // name — `{ opacity: 1 }` serialized as `1px` — so both the pulse and
  // scanline animations emitted invalid frames and never ran). The
  // `animation:` declarations in the css props below serialize correctly;
  // only the keyframe bodies need the raw stylesheet.
  const keyframesCss =
    `@keyframes seelePulse{0%,100%{opacity:1}50%{opacity:${1 - pulseIntensity}}}` +
    `@keyframes seeleScanline{0%{top:-2px}100%{top:100%}}`;

  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      width="100vw"
      height="100dvh"
      maxWidth="100%"
      maxHeight="100%"
      minWidth={0}
      minHeight={0}
      boxSizing="border-box"
      touchAction="none"
      bg={mergedSettings.bgColor}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      fontFamily={mergedSettings.fontFamily ?? SEELE_DEFAULT_FONT}
      overflow="hidden"
      css={{
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
          animation: `seeleScanline ${scanlineSpeed}s linear infinite`,
          pointerEvents: 'none',
          zIndex: 1,
          willChange: 'top',
        },
      }}
    >
      <VStack
        gap={{ base: 4, md: 8 }}
        maxWidth="100vw"
        px={{ base: 4, md: 8 }}
        boxSizing="border-box"
        align="center"
        justify="center"
        position="relative"
        zIndex={2}
        css={{
          animation: `seelePulse ${pulseSpeed}s ease-in-out infinite`,
        }}
      >
        <style>{keyframesCss}</style>
        <Text
          fontSize={`clamp(0.875rem, 5vmin, ${labelSize}px)`}
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
                        height: '1vmin',
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
              fontSize={`clamp(2.5rem, 22vmin, ${numberSize}px)`}
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
          fontSize={`clamp(0.875rem, 5vmin, ${labelSize}px)`}
          color={mergedSettings.textColor}
          fontWeight="bold"
          textTransform="uppercase"
          letterSpacing="0.1em"
          textAlign="center"
          maxWidth="100vw"
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
