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

/**
 * Props for {@link GenerationTab}.
 */
interface GenerationTabProps {
  /** Generation settings draft being edited (model, sampling, memory toggles). */
  readonly generationSettings: GenerationSettings;
  /** Current connection-test status: 'idle' | 'testing' | 'connected' | 'error'. */
  readonly connectionStatus: 'idle' | 'testing' | 'connected' | 'error';
  /** Connection error message to surface, or null when none. */
  readonly connectionError: string | null;
  /** Setter for the generation settings draft. */
  readonly setGenerationSettings: React.Dispatch<
    React.SetStateAction<GenerationSettings>
  >;
  /** Callback invoked when the user clicks "Test Connection". */
  readonly testConnection: () => void;
}

/**
 * Settings tab composing the generation connection and sampling field groups.
 *
 * Wires {@link GenerationConnectionFields} and
 * {@link GenerationSamplingFields} into a single scrollable tab consumed by
 * the settings modal.
 */
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
