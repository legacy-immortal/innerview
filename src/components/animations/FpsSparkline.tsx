import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';

const SPARKLINE_WIDTH = 320;
const SPARKLINE_HEIGHT = 120;
const FPS_MIN = 0;
const FPS_MAX = 240;

interface FpsSparklineProps {
  getSparkData: () => number[];
  color?: string;
}

function fpsStats(data: number[]): {
  high: number;
  low: number;
  avg: number;
} {
  if (data.length === 0) return { high: 0, low: 0, avg: 0 };
  const high = Math.max(...data);
  const low = Math.min(...data);
  const sum = data.reduce((a, b) => a + b, 0);
  const avg = sum / data.length;
  return { high, low, avg };
}

export const FpsSparkline = ({
  getSparkData,
  color = '#00D9FF',
}: FpsSparklineProps) => {
  const [points, setPoints] = useState<string>('');
  const [currentFps, setCurrentFps] = useState<number>(0);
  const [stats, setStats] = useState<{
    high: number;
    low: number;
    avg: number;
  }>({
    high: 0,
    low: 0,
    avg: 0,
  });
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const update = () => {
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
      width={`${SPARKLINE_WIDTH}px`}
      zIndex={5}
      pointerEvents="none"
    >
      <Box mb={2} textAlign="center">
        <HStack position="relative" width="100%">
          <VStack alignItems="flex-start" minW="200px">
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
              fontSize="42px"
              color="gray.400"
            >
              FPS
            </Text>
          </VStack>
        </HStack>
      </Box>
      <svg
        width={SPARKLINE_WIDTH}
        height={SPARKLINE_HEIGHT}
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
