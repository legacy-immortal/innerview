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

interface TranscriptionTabProps {
  readonly transcriptionSettings: TranscriptionSettings;
  readonly updateTranscriptionSetting: <K extends keyof TranscriptionSettings>(
    key: K,
    value: TranscriptionSettings[K]
  ) => void;
  readonly updateOpenAISetting: <
    K extends keyof NonNullable<TranscriptionSettings['openai']>,
  >(
    key: K,
    value: NonNullable<TranscriptionSettings['openai']>[K]
  ) => void;
  readonly updateLocalSetting: <
    K extends keyof NonNullable<TranscriptionSettings['local']>,
  >(
    key: K,
    value: NonNullable<TranscriptionSettings['local']>[K]
  ) => void;
}

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
