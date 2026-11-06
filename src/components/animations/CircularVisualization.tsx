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
import { DataSparkline } from './DataSparkline';
import { FpsSparkline } from './FpsSparkline';
import {
  DEFAULT_SYSTEM_TEXT,
  systemTextAnimationCss,
} from './systemTextAnimation';

interface CircularVisualizationProps {
  isActive: boolean;
  audioElement?: HTMLAudioElement | null;
  analyserNode?: AnalyserNode | null;
  useSpeechSynthesis?: boolean;
  isIdle?: boolean;
  layers?: WaveformLayer[];
  settings?: WaveformSettings;
  systemDataSource: ReturnType<typeof useSystemDataSource>;
}

export const CircularVisualization = ({
  isActive,
  audioElement,
  analyserNode,
  useSpeechSynthesis = false,
  isIdle = false,
  layers,
  settings,
  systemDataSource,
}: CircularVisualizationProps) => {
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

  // Update gauge value
  useEffect(() => {
    if (
      systemDataSource.visualizationType === 'gauge' &&
      systemDataSource.getValue
    ) {
      const update = () => {
        const result = systemDataSource.getValue?.();
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
      const interval = setInterval(update, 1000);
      return () => clearInterval(interval);
    }
  }, [systemDataSource]);

  // Update storage value
  useEffect(() => {
    if (
      systemDataSource.visualizationType === 'pie' &&
      systemDataSource.getValue
    ) {
      const update = async () => {
        const result = await systemDataSource.getValue?.();
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
  }, [systemDataSource]);

  // Update time value
  useEffect(() => {
    if (
      systemDataSource.visualizationType === 'clock' &&
      systemDataSource.getValue
    ) {
      const update = () => {
        const result = systemDataSource.getValue?.();
        if (result && typeof result === 'object' && 'hours' in result) {
          setTimeValue(
            result as { hours: number; minutes: number; seconds: number }
          );
        }
      };
      update();
      const interval = setInterval(update, 1000);
      return () => clearInterval(interval);
    }
  }, [systemDataSource]);

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

  const SystemLabel = () =>
    systemDataSource.showSourceLabel && isIdle ? (
      <Box
        position="absolute"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        zIndex={10}
        fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
        fontSize="md"
        letterSpacing="0.1em"
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

  const vizWrapperStyle = {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    pointerEvents: 'none' as const,
  };

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
      opacity={isIdle ? 0.5 : 0.9}
      transition="opacity 0.3s ease-in-out"
    >
      <SystemLabel />
      <Box css={vizWrapperStyle}>
        {visualizationType === 'waveform' &&
          systemDataSource.currentSource.id === 'frametiming' &&
          systemDataSource.currentSource.getSparkData != null && (
            <FpsSparkline
              getSparkData={systemDataSource.currentSource.getSparkData}
              color={color}
            />
          )}
        {visualizationType === 'waveform' &&
          systemDataSource.currentSource.id === 'network' &&
          systemDataSource.currentSource.getSparkData != null && (
            <DataSparkline
              getSparkData={systemDataSource.currentSource.getSparkData}
              label="Request activity"
              formatValue={(v) => `${Math.round(v)} req`}
              valueMin={0}
              valueMax={20}
              color={color}
            />
          )}
        {visualizationType === 'waveform' &&
          systemDataSource.currentSource.id !== 'frametiming' &&
          systemDataSource.currentSource.id !== 'network' && (
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
  );
};
