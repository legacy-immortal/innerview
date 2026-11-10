/**
 * @file Data sparkline visualization — renders a throttled SVG sparkline for
 * a generic numeric data series.
 * @module components/animations/DataSparkline
 */

import type { ReactElement } from 'react';
import { Box, Text } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';

const SPARKLINE_WIDTH = 320;
const SPARKLINE_HEIGHT = 120;

/** Props for the data sparkline visualization. */
interface DataSparklineProps {
  /** Returns the current sparkline data points. */
  readonly getSparkData: () => readonly number[];
  /** Label above the value (e.g. "Network"). */
  readonly label: string;
  /** Format the current value for display (e.g. (v) => `${v} req`). */
  readonly formatValue: (value: number) => string;
  /** Y-axis minimum. */
  readonly valueMin?: number;
  /** Y-axis maximum. */
  readonly valueMax?: number;
  /** Stroke/fill accent color. */
  readonly color?: string;
}

/**
 * Renders a sparkline chart for a numeric data source.
 * @param props - Sparkline display properties.
 * @returns The sparkline element.
 */
export const DataSparkline = ({
  getSparkData,
  label,
  formatValue,
  valueMin = 0,
  valueMax = 20,
  color = '#00D9FF',
}: DataSparklineProps): ReactElement => {
  const [points, setPoints] = useState<string>('');
  const [currentValue, setCurrentValue] = useState<number>(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    let lastUpdate = 0;
    const update = (t: number) => {
      // Throttle to ~10fps: sparkline data changes slowly, and each
      // update triggers a React re-render. Also skip while tab hidden.
      if (t - lastUpdate < 100 || document.hidden) {
        frameRef.current = requestAnimationFrame(update);
        return;
      }
      lastUpdate = t;
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
        fontSize="clamp(1.25rem, 5vmin, 1.5rem)"
        fontWeight={600}
        color={color}
        textAlign="center"
        mb={2}
      >
        {formatValue(currentValue)}
      </Text>
      <svg
        viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
        width="100%"
        height="auto"
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
