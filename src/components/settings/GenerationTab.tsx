/**
 * @file Settings tab composing connection and sampling field groups.
 * @module components/settings/GenerationTab.tsx
 */
import type { GenerationSettings } from '@/lib/settings-types';
import { VStack } from '@chakra-ui/react';
import type { JSX } from 'react';
import { memo } from 'react';
import { GenerationConnectionFields } from './GenerationConnectionFields';
import { GenerationSamplingFields } from './GenerationSamplingFields';

interface GenerationTabProps {
  readonly generationSettings: GenerationSettings;
  readonly connectionStatus: 'idle' | 'testing' | 'connected' | 'error';
  readonly connectionError: string | null;
  readonly setGenerationSettings: React.Dispatch<
    React.SetStateAction<GenerationSettings>
  >;
  readonly testConnection: () => void;
}

export const GenerationTab = memo(function GenerationTab({
  generationSettings,
  connectionStatus,
  connectionError,
  setGenerationSettings,
  testConnection,
}: GenerationTabProps): JSX.Element {
  return (
    <VStack gap={4} align="stretch">
      <GenerationConnectionFields
        generationSettings={generationSettings}
        connectionStatus={connectionStatus}
        connectionError={connectionError}
        setGenerationSettings={setGenerationSettings}
        testConnection={testConnection}
      />
      <GenerationSamplingFields
        generationSettings={generationSettings}
        setGenerationSettings={setGenerationSettings}
      />
    </VStack>
  );
});
