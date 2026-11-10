/**
 * @file FPS sparkline visualization — renders frame-rate history with
 * summary statistics.
 * @module components/animations/FpsSparkline
 */

import type { ReactElement } from 'react';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';

const SPARKLINE_WIDTH = 320;
const SPARKLINE_HEIGHT = 120;
const FPS_MIN = 0;
const FPS_MAX = 240;

/** Summary statistics for an FPS sample window. */
interface FpsStats {
  readonly high: number;
  readonly low: number;
  readonly avg: number;
}

/** Props for the FPS sparkline visualization. */
interface FpsSparklineProps {
  /** Returns the current FPS sample buffer. */
  readonly getSparkData: () => readonly number[];
  /** Accent color for the chart. */
  readonly color?: string;
}

/**
 * Computes high/low/average statistics for an FPS sample set.
 * @param data - FPS samples.
 * @returns The computed statistics.
 */
function fpsStats(data: readonly number[]): FpsStats {
  if (data.length === 0) return { high: 0, low: 0, avg: 0 };
  const high = Math.max(...data);
  const low = Math.min(...data);
  const sum = data.reduce((a, b) => a + b, 0);
  const avg = sum / data.length;
  return { high, low, avg };
}

/**
 * Renders an FPS sparkline with current and summary values.
 * @param props - Sparkline display properties.
 * @returns The sparkline element.
 */
export const FpsSparkline = ({
  getSparkData,
  color = '#00D9FF',
}: FpsSparklineProps): ReactElement => {
  const [points, setPoints] = useState<string>('');
  const [currentFps, setCurrentFps] = useState<number>(0);
  const [stats, setStats] = useState<FpsStats>({
    high: 0,
    low: 0,
    avg: 0,
  });
  const frameRef = useRef<number>(0);

  useEffect(() => {
    let lastUpdate = 0;
    const update = (t: number) => {
      // Throttle to ~10fps: FPS data changes slowly, and each update
      // triggers a React re-render. Also skip while tab hidden.
      if (t - lastUpdate < 100 || document.hidden) {
        frameRef.current = requestAnimationFrame(update);
        return;
      }
      lastUpdate = t;
      const data = getSparkData();
      if (data.length < 2) {
        setPoints('');
        setCurrentFps(0);
        setStats({ high: 0, low: 0, avg: 0 });
      } else {
        const min = FPS_MIN;
        const max = FPS_MAX;
        const range = max - min || 1;
        const xStep = SPARKLINE_WIDTH / (data.length - 1);
        const pathD = data
          .map((fps, i) => {
            const x = i * xStep;
            const y =
              SPARKLINE_HEIGHT -
              ((Math.min(Math.max(fps, min), max) - min) / range) *
                SPARKLINE_HEIGHT;
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
          })
          .join(' ');
        setPoints(pathD);
        setCurrentFps(data[data.length - 1] ?? 0);
        setStats(fpsStats(data));
      }
      frameRef.current = requestAnimationFrame(update);
    };
    frameRef.current = requestAnimationFrame(update);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [getSparkData]);

  const round = (n: number) => Math.round(n);

  return (
    <Box
      position="absolute"
      top="50%"
      left="50%"
      transform="translate(-50%, -50%)"
      width={{
        base: 'min(92vw, 420px)',
        md: 'min(60vw, 520px)',
      }}
      maxW="92vw"
      minW={0}
      boxSizing="border-box"
      px={{ base: 2, md: 4 }}
      zIndex={5}
      pointerEvents="none"
      style={{ touchAction: 'none' }}
    >
      <Box mb={2} textAlign="center">
        <HStack position="relative" width="100%">
          <VStack
            alignItems="flex-start"
            minW={{ base: 'min(200px, 55vw)', md: '200px' }}
          >
            <Text
              fontFamily="'JetBrains Mono', 'Fira Code', monospace"
              fontSize="xl"
              fontWeight={600}
              color={color}
              as="span"
              fontVariantNumeric="tabular-nums"
            >
              curr {round(currentFps)}
            </Text>
            <Text
              fontFamily="'JetBrains Mono', 'Fira Code', monospace"
              fontSize="sm"
              color="gray.400"
              mt={1}
              fontVariantNumeric="tabular-nums"
            >
              high {round(stats.high)} · low {round(stats.low)} · avg{' '}
              {round(stats.avg)}
            </Text>
          </VStack>
          <VStack position="absolute" right="0%" top="2.5%">
            <Text
              fontFamily="'JetBrains Mono', 'Fira Code', monospace"
              fontSize="clamp(1.5rem, 8vmin, 42px)"
              color="gray.400"
            >
              FPS
            </Text>
          </VStack>
        </HStack>
      </Box>
      <svg
        viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
        width="100%"
        height="auto"
        style={{ display: 'block' }}
      >
        <defs>
          <linearGradient
            id="fpsSparklineGradient"
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <rect
          width={SPARKLINE_WIDTH}
          height={SPARKLINE_HEIGHT}
          fill="url(#fpsSparklineGradient)"
          opacity={0.15}
        />
        {points && (
          <>
            <path
              d={points}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
          </>
        )}
      </svg>
    </Box>
  );
};
