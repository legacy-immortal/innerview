/**
 * @file Settings tab composing transcription fields and test panels.
 * @module components/settings/TranscriptionTab.tsx
 */
import type { TranscriptionSettings } from '@/lib/settings-types';
import { VStack } from '@chakra-ui/react';
import type { JSX } from 'react';
import { memo } from 'react';
import { CustomAudioTestPanel } from './CustomAudioTestPanel';
import {
  LocalFields,
  OpenAIFields,
  TranscriptionProviderField,
} from './TranscriptionSettingsFields';
import { TranscriptionServiceTestPanel } from './TranscriptionServiceTestPanel';
import { useTranscriptionTest } from '@/hooks/useTranscriptionTest';

/**
 * Props for {@link TranscriptionTab}.
 */
interface TranscriptionTabProps {
  /** Transcription settings draft being edited. */
  readonly transcriptionSettings: TranscriptionSettings;
  /** Generic setter keyed by any TranscriptionSettings key. */
  readonly updateTranscriptionSetting: <K extends keyof TranscriptionSettings>(
    key: K,
    value: TranscriptionSettings[K]
  ) => void;
  /** Setter keyed by any OpenAI transcription sub-setting key. */
  readonly updateOpenAISetting: <
    K extends keyof NonNullable<TranscriptionSettings['openai']>,
  >(
    key: K,
    value: NonNullable<TranscriptionSettings['openai']>[K]
  ) => void;
  /** Setter keyed by any local transcription sub-setting key. */
  readonly updateLocalSetting: <
    K extends keyof NonNullable<TranscriptionSettings['local']>,
  >(
    key: K,
    value: NonNullable<TranscriptionSettings['local']>[K]
  ) => void;
}

/**
 * Settings tab composing transcription fields and test panels.
 *
 * Renders the provider picker, the OpenAI or local field group depending on
 * provider, the transcription service test panel, and the custom-audio test
 * panel. Consumed by the settings modal.
 */
export const TranscriptionTab = memo(function TranscriptionTab({
  transcriptionSettings,
  updateTranscriptionSetting,
  updateOpenAISetting,
  updateLocalSetting,
}: TranscriptionTabProps): JSX.Element {
  const {
    transcriptionModels,
    fileInputRef,
    audioRef,
    testState,
    loadedFile,
    customTestState,
    lastLog,
    customLastLog,
    handleLoadMP3,
    onMP3FileChange,
    transcribeLoadedFile,
    runTranscriptionTest,
  } = useTranscriptionTest(transcriptionSettings);

  const fieldProps = {
    transcriptionSettings,
    updateTranscriptionSetting,
    updateOpenAISetting,
    updateLocalSetting,
  };

  return (
    <VStack gap={4} align="stretch">
      <TranscriptionProviderField {...fieldProps} />

      {transcriptionSettings.provider === 'openai' && (
        <OpenAIFields
          {...fieldProps}
          transcriptionModels={transcriptionModels}
        />
      )}

      {transcriptionSettings.provider === 'local' && (
        <LocalFields {...fieldProps} />
      )}

      <TranscriptionServiceTestPanel
        testState={testState}
        lastLog={lastLog}
        runTranscriptionTest={runTranscriptionTest}
      />

      <CustomAudioTestPanel
        fileInputRef={fileInputRef}
        audioRef={audioRef}
        loadedFile={loadedFile}
        customTestState={customTestState}
        customLastLog={customLastLog}
        handleLoadMP3={handleLoadMP3}
        onMP3FileChange={onMP3FileChange}
        transcribeLoadedFile={transcribeLoadedFile}
      />
    </VStack>
  );
});
