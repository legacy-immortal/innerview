/**
 * @file Field groups for transcription provider selection and per-provider options.
 * @module components/settings/TranscriptionSettingsFields.tsx
 */
// Transcription provider configuration fields (extracted from TranscriptionTab.tsx).
import type { JSX } from 'react';
import type { TranscriptionSettings } from '@/lib/settings-types';
import {
  Field,
  HStack,
  Input,
  NativeSelect,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react';

export interface TranscriptionFieldProps {
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

export function TranscriptionProviderField({
  transcriptionSettings,
  updateTranscriptionSetting,
}: TranscriptionFieldProps): JSX.Element {
  return (
    <Field.Root>
      <Field.Label color="gray.300">Transcription Provider</Field.Label>
      <Field.HelperText color="gray.500" fontSize="xs">
        Select the transcription provider to use
      </Field.HelperText>
      <NativeSelect.Root>
        <NativeSelect.Field
          value={transcriptionSettings.provider}
          onChange={(e) =>
            updateTranscriptionSetting(
              'provider',
              e.currentTarget.value as 'openai' | 'local'
            )
          }
          bg="rgba(255, 255, 255, 0.05)"
          borderColor="rgba(255, 255, 255, 0.1)"
          color="white"
          _focus={{ borderColor: 'emerald.400' }}
        >
          <option value="openai">OpenAI (Cloud)</option>
          <option value="local">Local (Browser/Backend)</option>
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    </Field.Root>
  );
}

export function OpenAIFields({
  transcriptionSettings,
  updateOpenAISetting,
  transcriptionModels,
}: TranscriptionFieldProps & { transcriptionModels: string[] }): JSX.Element {
  return (
    <VStack
      gap={3}
      align="stretch"
      pl={4}
      borderLeft="1px solid"
      borderColor="rgba(255, 255, 255, 0.1)"
    >
      <Field.Root>
        <Field.Label color="gray.300">Model</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          OpenAI transcription model
        </Field.HelperText>
        <NativeSelect.Root>
          <NativeSelect.Field
            value={transcriptionSettings.openai?.modelId || 'whisper-1'}
            onChange={(e) =>
              updateOpenAISetting('modelId', e.currentTarget.value)
            }
            bg="rgba(255, 255, 255, 0.05)"
            borderColor="rgba(255, 255, 255, 0.1)"
            color="white"
            _focus={{ borderColor: 'emerald.400' }}
          >
            {transcriptionModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Field.Root>

      <Field.Root>
        <Field.Label color="gray.300">Language</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          Language code (optional, e.g., en, es, fr)
        </Field.HelperText>
        <Input
          value={transcriptionSettings.openai?.language || ''}
          onChange={(e) =>
            updateOpenAISetting('language', e.currentTarget.value || undefined)
          }
          bg="rgba(255, 255, 255, 0.05)"
          borderColor="rgba(255, 255, 255, 0.1)"
          color="white"
          _focus={{ borderColor: 'emerald.400' }}
          placeholder="Auto-detect"
        />
      </Field.Root>

      <Field.Root>
        <Field.Label color="gray.300">Timestamp Granularities</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          Include word-level or segment-level timestamps
        </Field.HelperText>
        <VStack gap={2} align="stretch">
          <HStack>
            <input
              type="checkbox"
              checked={transcriptionSettings.openai?.timestampGranularities?.includes(
                'word'
              )}
              onChange={(e) => {
                const current =
                  transcriptionSettings.openai?.timestampGranularities || [];
                const updated = e.currentTarget.checked
                  ? [...current, 'word']
                  : current.filter((g) => g !== 'word');
                updateOpenAISetting(
                  'timestampGranularities',
                  updated.length > 0
                    ? (updated as ('word' | 'segment')[])
                    : undefined
                );
              }}
              style={{
                accentColor: '#10b981',
              }}
            />
            <Text color="gray.200" fontSize="sm">
              Word-level timestamps
            </Text>
          </HStack>
          <HStack>
            <input
              type="checkbox"
              checked={transcriptionSettings.openai?.timestampGranularities?.includes(
                'segment'
              )}
              onChange={(e) => {
                const current =
                  transcriptionSettings.openai?.timestampGranularities || [];
                const updated = e.currentTarget.checked
                  ? [...current, 'segment']
                  : current.filter((g) => g !== 'segment');
                updateOpenAISetting(
                  'timestampGranularities',
                  updated.length > 0
                    ? (updated as ('word' | 'segment')[])
                    : undefined
                );
              }}
              style={{
                accentColor: '#10b981',
              }}
            />
            <Text color="gray.200" fontSize="sm">
              Segment-level timestamps
            </Text>
          </HStack>
        </VStack>
      </Field.Root>
    </VStack>
  );
}

export function LocalFields({
  transcriptionSettings,
  updateLocalSetting,
}: TranscriptionFieldProps): JSX.Element {
  return (
    <VStack
      gap={3}
      align="stretch"
      pl={4}
      borderLeft="1px solid"
      borderColor="rgba(255, 255, 255, 0.1)"
    >
      <Field.Root>
        <Field.Label color="gray.300">Processing Mode</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          Browser runs locally in your browser, Backend uses the server
        </Field.HelperText>
        <NativeSelect.Root>
          <NativeSelect.Field
            value={transcriptionSettings.local?.mode || 'browser'}
            onChange={(e) =>
              updateLocalSetting(
                'mode',
                e.currentTarget.value as 'browser' | 'backend'
              )
            }
            bg="rgba(255, 255, 255, 0.05)"
            borderColor="rgba(255, 255, 255, 0.1)"
            color="white"
            _focus={{ borderColor: 'emerald.400' }}
          >
            <option value="browser">Browser (Transformers.js)</option>
            <option value="backend">Backend (Server API)</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Field.Root>

      <Field.Root>
        <Field.Label color="gray.300">Model</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          Local transcription model (Hugging Face model ID)
        </Field.HelperText>
        <Input
          value={transcriptionSettings.local?.modelId || 'Xenova/whisper-base'}
          onChange={(e) => updateLocalSetting('modelId', e.currentTarget.value)}
          bg="rgba(255, 255, 255, 0.05)"
          borderColor="rgba(255, 255, 255, 0.1)"
          color="white"
          _focus={{ borderColor: 'emerald.400' }}
          placeholder="Xenova/whisper-base"
        />
      </Field.Root>

      <Field.Root>
        <Field.Label color="gray.300">Language</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          Language code (optional, e.g., en, es, fr)
        </Field.HelperText>
        <Input
          value={transcriptionSettings.local?.language || ''}
          onChange={(e) =>
            updateLocalSetting('language', e.currentTarget.value || undefined)
          }
          bg="rgba(255, 255, 255, 0.05)"
          borderColor="rgba(255, 255, 255, 0.1)"
          color="white"
          _focus={{ borderColor: 'emerald.400' }}
          placeholder="Auto-detect"
        />
      </Field.Root>

      <Field.Root>
        <Field.Label color="gray.300">Task</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          Transcribe or translate audio
        </Field.HelperText>
        <NativeSelect.Root>
          <NativeSelect.Field
            value={transcriptionSettings.local?.task || 'transcribe'}
            onChange={(e) =>
              updateLocalSetting(
                'task',
                e.currentTarget.value as 'transcribe' | 'translate'
              )
            }
            bg="rgba(255, 255, 255, 0.05)"
            borderColor="rgba(255, 255, 255, 0.1)"
            color="white"
            _focus={{ borderColor: 'emerald.400' }}
          >
            <option value="transcribe">Transcribe</option>
            <option value="translate">Translate</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Field.Root>

      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <VStack align="start" gap={0}>
          <Text color="gray.200" fontSize="sm">
            Quantized Model
          </Text>
          <Text color="gray.500" fontSize="xs">
            Use quantized model for faster loading
          </Text>
        </VStack>
        <Switch.Root
          checked={transcriptionSettings.local?.quantized !== false}
          onCheckedChange={(e) => updateLocalSetting('quantized', e.checked)}
          colorPalette="emerald"
        >
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Root>
      </HStack>
    </VStack>
  );
}
