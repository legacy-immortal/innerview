import { Box, Text } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';

const SPARKLINE_WIDTH = 320;
const SPARKLINE_HEIGHT = 120;

interface DataSparklineProps {
  getSparkData: () => number[];
  /** Label above the value (e.g. "Network") */
  label: string;
  /** Format the current value for display (e.g. (v) => `${v} req`) */
  formatValue: (value: number) => string;
  /** Y-axis range for the sparkline */
  valueMin?: number;
  valueMax?: number;
  color?: string;
}

export const DataSparkline = ({
  getSparkData,
  label,
  formatValue,
  valueMin = 0,
  valueMax = 20,
  color = '#00D9FF',
}: DataSparklineProps) => {
  const [points, setPoints] = useState<string>('');
  const [currentValue, setCurrentValue] = useState<number>(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const update = () => {
      const data = getSparkData();
      if (data.length < 2) {
        setPoints('');
        setCurrentValue(0);
      } else {
        const range = valueMax - valueMin || 1;
        const xStep = SPARKLINE_WIDTH / (data.length - 1);
        const pathD = data
          .map((val, i) => {
            const x = i * xStep;
            const clamped = Math.min(Math.max(val, valueMin), valueMax);
            const y =
              SPARKLINE_HEIGHT -
              ((clamped - valueMin) / range) * SPARKLINE_HEIGHT;
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
          })
          .join(' ');
        setPoints(pathD);
        setCurrentValue(data[data.length - 1] ?? 0);
      }
      frameRef.current = requestAnimationFrame(update);
    };
    frameRef.current = requestAnimationFrame(update);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [getSparkData, valueMin, valueMax]);

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
      <Text
        fontFamily="'JetBrains Mono', 'Fira Code', monospace"
        fontSize="sm"
        color="gray.400"
        textAlign="center"
        mb={0.5}
      >
        {label}
      </Text>
      <Text
        fontFamily="'JetBrains Mono', 'Fira Code', monospace"
        fontSize="2xl"
        fontWeight={600}
        color={color}
        textAlign="center"
        mb={2}
      >
        {formatValue(currentValue)}
      </Text>
      <svg
        width={SPARKLINE_WIDTH}
        height={SPARKLINE_HEIGHT}
        style={{ display: 'block' }}
      >
        <defs>
          <linearGradient
            id="dataSparklineGradient"
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
          fill="url(#dataSparklineGradient)"
          opacity={0.15}
        />
        {points && (
          <path
            d={points}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.9}
          />
        )}
      </svg>
    </Box>
  );
};
