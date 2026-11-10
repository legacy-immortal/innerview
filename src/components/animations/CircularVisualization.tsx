/**
 * @file Circular visualization container — selects and renders the active
 * system visualization (waveform, gauge, pie, clock, sparklines) with labels.
 * @module components/animations/CircularVisualization
 */

import type { ReactElement } from 'react';
import type {
  WaveformLayer,
  WaveformSettings,
} from '@/components/background/BackgroundControlPanel';
import type { useSystemDataSource } from '@/hooks/useSystemDataSource';
import { useSettingsStore } from '@/lib/settings-store';
import { Box, Text } from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { CircularClock } from './CircularClock';
import { CircularGauge } from './CircularGauge';
import { CircularStorage } from './CircularStorage';
import { CircularWaveform } from './CircularWaveform';
import {
  DEFAULT_SYSTEM_TEXT,
  systemTextAnimationCss,
} from './systemTextAnimation';

/** Props for the circular visualization container. */
interface CircularVisualizationProps {
  readonly isActive: boolean;
  readonly audioElement?: HTMLAudioElement | null;
  readonly analyserNode?: AnalyserNode | null;
  readonly useSpeechSynthesis?: boolean;
  readonly isIdle?: boolean;
  readonly layers?: WaveformLayer[];
  readonly settings?: WaveformSettings;
  readonly systemDataSource: ReturnType<typeof useSystemDataSource>;
}

/**
 * Renders the appropriate circular visualization for the current system data
 * source, including optional system labels and sparklines.
 * @param props - Visualization properties and data source.
 * @returns The visualization element, or null when inactive.
 */
export const CircularVisualization = ({
  isActive,
  audioElement,
  analyserNode,
  useSpeechSynthesis = false,
  isIdle = false,
  layers,
  settings,
  systemDataSource,
}: CircularVisualizationProps): ReactElement | null => {
  const [gaugeValue, setGaugeValue] = useState<{
    value: number;
    max: number;
  } | null>(null);
  const [storageValue, setStorageValue] = useState<{
    value: number;
    max: number;
  } | null>(null);
  const [timeValue, setTimeValue] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  const systemTextOpts = useSettingsStore(
    useShallow(
      (state) => state.settings?.background?.systemText ?? DEFAULT_SYSTEM_TEXT
    )
  );
  const systemVisualization = useSettingsStore(
    useShallow((state) => state.settings?.background?.systemVisualization)
  );
  const scale = systemVisualization?.scale ?? 1;
  const color = systemVisualization?.color ?? '#00D9FF';
  const offsetX = systemVisualization?.offsetX ?? 0;
  const offsetY = systemVisualization?.offsetY ?? 0;
  const showSeconds = systemVisualization?.types?.clock?.showSeconds !== false;

  const systemTextCss = useMemo(
    () => systemTextAnimationCss(systemTextOpts, 'systemTextFade'),
    [systemTextOpts]
  );

  const vizType = systemDataSource.visualizationType;
  const getValueFn = systemDataSource.getValue;
  const isDocumentHidden = (): boolean =>
    typeof document !== 'undefined' && document.hidden;

  // Update gauge value (throttled to 2s, paused while tab hidden)
  useEffect(() => {
    if (vizType === 'gauge' && getValueFn) {
      const update = () => {
        if (isDocumentHidden()) return;
        const result = getValueFn();
        if (
          result &&
          typeof result === 'object' &&
          'value' in result &&
          'max' in result
        ) {
          setGaugeValue(result as { value: number; max: number });
        }
      };
      update();
      const interval = setInterval(update, 2000);
      return () => clearInterval(interval);
    }
  }, [vizType, getValueFn]);

  // Update storage value
  useEffect(() => {
    if (vizType === 'pie' && getValueFn) {
      const update = async () => {
        if (isDocumentHidden()) return;
        const result = await getValueFn();
        if (
          result &&
          typeof result === 'object' &&
          'value' in result &&
          'max' in result
        ) {
          setStorageValue(result as { value: number; max: number });
        }
      };
      update();
      const interval = setInterval(update, 2000);
      return () => clearInterval(interval);
    }
  }, [vizType, getValueFn]);

  // Update time value (throttled to 2s; clock ticks visibly but cheap)
  useEffect(() => {
    if (vizType === 'clock' && getValueFn) {
      const update = () => {
        if (isDocumentHidden()) return;
        const result = getValueFn();
        if (result && typeof result === 'object' && 'hours' in result) {
          setTimeValue(
            result as { hours: number; minutes: number; seconds: number }
          );
        }
      };
      update();
      const interval = setInterval(update, 2000);
      return () => clearInterval(interval);
    }
  }, [vizType, getValueFn]);

  // System data source label: [SYSTEM]: description or tokens (context); appear, hold, then fade
  const labelText =
    systemDataSource.currentSource.id === 'context'
      ? (() => {
          const v = systemDataSource.getValue?.();
          if (v && typeof v === 'object' && 'value' in v && 'max' in v) {
            const { value, max } = v as { value: number; max: number };
            return `${value.toLocaleString()} / ${max.toLocaleString()}`;
          }
          return '— / —';
        })()
      : systemDataSource.currentSource.description;

  const SystemLabel = (): ReactElement | null =>
    systemDataSource.showSourceLabel && isIdle ? (
      <Box
        key={`${vizType}:${labelText}`}
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        display="flex"
        alignItems="center"
        justifyContent="center"
        zIndex={10}
        pointerEvents="none"
        fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
        fontSize="md"
        letterSpacing="0.1em"
        textAlign="center"
        maxWidth="90vw"
        margin="0 auto"
        px={4}
        css={systemTextCss}
      >
        <Text
          as="span"
          color="cyan.400"
          fontWeight={600}
          fontSize="md"
          css={{
            textShadow: '0 0 4px rgba(255, 255, 255, 0.08)',
          }}
        >
          [SYSTEM]:
        </Text>
        <Text
          as="span"
          ml={3}
          color="gray.300"
          fontSize="md"
          css={{
            textShadow: '0 0 4px rgba(255, 255, 255, 0.08)',
          }}
        >
          {labelText}
        </Text>
      </Box>
    ) : null;

  if (!isActive && !isIdle) return null;

  const visualizationType = systemDataSource.visualizationType || 'waveform';

  return (
    <Box
      position="absolute"
      top="0"
      left="0"
      right="0"
      bottom="0"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={5}
      pointerEvents="none"
      width="100vw"
      height="100dvh"
      touchAction="none"
      userSelect="none"
      opacity={isIdle ? 0.5 : 0.9}
      transition="opacity 0.3s ease-in-out"
    >
      <SystemLabel />
      {/* Outer box: layout-sized and flex-centered by parent. Inner box: visual
          transform (scale/offset) applied as inline style so transform and
          transform-origin stay atomic and cannot desync during adjustments. */}
      <Box
        position="relative"
        flexShrink={0}
        width={{ base: '80vmin', md: '70vmin', lg: '60vmin' }}
        height={{ base: '80vmin', md: '70vmin', lg: '60vmin' }}
      >
        <Box
          position="absolute"
          inset="0"
          display="flex"
          alignItems="center"
          justifyContent="center"
          pointerEvents="none"
          style={{
            transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Audio playback takes priority: render the live audio waveform. */}
          {isActive && (
            <CircularWaveform
              isActive={isActive}
              audioElement={audioElement}
              analyserNode={analyserNode}
              useSpeechSynthesis={useSpeechSynthesis}
              isIdle={isIdle}
              layers={layers}
              settings={settings}
              systemDataSource={systemDataSource}
            />
          )}
          {/* Idle system sources with waveform type render the circular waveform. */}
          {!isActive && visualizationType === 'waveform' && (
            <CircularWaveform
              isActive={false}
              audioElement={null}
              analyserNode={null}
              useSpeechSynthesis={false}
              isIdle={isIdle}
              layers={layers}
              settings={settings}
              systemDataSource={systemDataSource}
            />
          )}
          {visualizationType === 'gauge' && gaugeValue && (
            <CircularGauge
              value={gaugeValue.value}
              max={gaugeValue.max}
              size={500}
              color={color}
            />
          )}
          {visualizationType === 'pie' && storageValue && (
            <CircularStorage
              used={storageValue.value}
              total={storageValue.max}
              size={400}
              color={color}
            />
          )}
          {visualizationType === 'clock' && timeValue && (
            <CircularClock
              hours={timeValue.hours}
              minutes={timeValue.minutes}
              seconds={timeValue.seconds}
              size={2000}
              color={color}
              showSeconds={showSeconds}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};
