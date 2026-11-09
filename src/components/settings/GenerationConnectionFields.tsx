/**
 * @file Fields for provider base URL and API key plus the connection test control.
 * @module components/settings/GenerationConnectionFields.tsx
 */
// Provider/connection/model fields (extracted from GenerationTab.tsx).
import {
  ZEN_BASE_URL,
  ZEN_DEFAULT_MODEL_ID,
  ZEN_FREE_MODELS,
} from '@/lib/constants';
import type { GenerationSettings } from '@/lib/settings-types';
import {
  Box,
  Button,
  Field,
  HStack,
  Input,
  NativeSelect,
  Separator,
  Switch,
  Text,
} from '@chakra-ui/react';
import type { Dispatch, SetStateAction } from 'react';
import type { JSX } from 'react';
import { useCallback } from 'react';
import {
  getProviderPreset,
  isRemoteProvider,
  OPENAI_BASE_URL,
} from '@/lib/generationProviderUtils';

export interface GenerationConnectionFieldsProps {
  readonly generationSettings: GenerationSettings;
  readonly connectionStatus: 'idle' | 'testing' | 'connected' | 'error';
  readonly connectionError: string | null;
  readonly setGenerationSettings: Dispatch<SetStateAction<GenerationSettings>>;
  readonly testConnection: () => void;
}

export function GenerationConnectionFields({
  generationSettings,
  connectionStatus,
  connectionError,
  setGenerationSettings,
  testConnection,
}: GenerationConnectionFieldsProps): JSX.Element {
  const providerPreset = getProviderPreset(generationSettings.baseURL);
  const isZen = providerPreset === 'zen';

  const handlePresetChange = useCallback(
    (value: string) => {
      const preset = value as 'custom' | 'openai' | 'zen';
      if (preset === 'zen') {
        setGenerationSettings((prev) => ({
          ...prev,
          baseURL: ZEN_BASE_URL,
          apiKey: undefined,
          modelName: ZEN_DEFAULT_MODEL_ID,
          availableModels: ZEN_FREE_MODELS.map((m) => m.id),
        }));
      } else if (preset === 'openai') {
        setGenerationSettings((prev) => ({
          ...prev,
          baseURL: OPENAI_BASE_URL,
          modelName: 'gpt-5',
          availableModels: [],
        }));
      }
    },
    [setGenerationSettings]
  );

  return (
    <>
      <Field.Root>
        <Field.Label color="gray.300">Provider</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          Preset for API endpoint and key. Zen (OpenCode) offers free models
          with your API key from opencode.ai.
        </Field.HelperText>
        <NativeSelect.Root>
          <NativeSelect.Field
            value={providerPreset}
            onChange={(e) => handlePresetChange(e.target.value)}
            bg="rgba(255, 255, 255, 0.05)"
            borderColor="rgba(255, 255, 255, 0.1)"
            color="white"
            _focus={{ borderColor: 'emerald.400' }}
          >
            <option value="custom">Custom (manual base URL)</option>
            <option value="openai">OpenAI</option>
            <option value="zen">Zen (OpenCode)</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Field.Root>

      <Separator borderColor="rgba(255, 255, 255, 0.1)" />

      <Field.Root>
        <Field.Label color="gray.300">Reasoning Tag</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          Primary tag name for reasoning blocks. Common tags like &lt;think&gt;,
          &lt;thinking&gt;, and &lt;reasoning&gt; are auto-detected regardless
          of this setting. Case-insensitive.
        </Field.HelperText>
        <Input
          value={generationSettings.reasoningTag || 'thinking'}
          onChange={(e) =>
            setGenerationSettings((prev) => ({
              ...prev,
              reasoningTag: e.target.value || 'thinking',
            }))
          }
          bg="rgba(255, 255, 255, 0.05)"
          borderColor="rgba(255, 255, 255, 0.1)"
          color="white"
          _focus={{ borderColor: 'emerald.400' }}
          fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
          placeholder="thinking"
        />
      </Field.Root>

      <Separator borderColor="rgba(255, 255, 255, 0.1)" />

      <Field.Root>
        <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
          <Box flex={1} minW={0}>
            <Field.Label color="gray.300" mb={0}>
              Enable Streaming
            </Field.Label>
            <Text color="gray.500" fontSize="xs">
              Stream tokens in real-time as they are generated. Reasoning and
              tool calls will be parsed and displayed in their respective UI
              elements during streaming.
            </Text>
          </Box>
          <Switch.Root
            checked={generationSettings.streamingEnabled !== false}
            onCheckedChange={(details) =>
              setGenerationSettings((prev) => ({
                ...prev,
                streamingEnabled: details.checked,
              }))
            }
            colorPalette="emerald"
          >
            <Switch.HiddenInput />
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Root>
        </HStack>
      </Field.Root>

      <Separator borderColor="rgba(255, 255, 255, 0.1)" />

      <Field.Root>
        <Field.Label color="gray.300">Base URL</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          {isZen
            ? 'Zen endpoint is set automatically. Set ZEN_API_KEY in server .env for authentication.'
            : 'Base URL for OpenAI-compatible API (e.g., https://api.openai.com/v1 or https://localhost:5001/v1)'}
        </Field.HelperText>
        <HStack gap={2} flexWrap="wrap" minW={0}>
          <Input
            value={generationSettings.baseURL || ''}
            onChange={(e) =>
              setGenerationSettings((prev) => ({
                ...prev,
                baseURL: e.target.value,
                availableModels: [],
              }))
            }
            readOnly={isZen}
            bg="rgba(255, 255, 255, 0.05)"
            borderColor="rgba(255, 255, 255, 0.1)"
            color="white"
            _focus={isZen ? undefined : { borderColor: 'emerald.400' }}
            fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
            placeholder="https://api.openai.com/v1"
            flex={1}
          />
          <Button
            onClick={testConnection}
            disabled={connectionStatus === 'testing'}
            colorPalette={
              connectionStatus === 'connected'
                ? 'emerald'
                : connectionStatus === 'error'
                  ? 'red'
                  : 'gray'
            }
            size="sm"
            fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
          >
            {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
          </Button>
          <Box
            w="12px"
            h="12px"
            borderRadius="full"
            bg={
              connectionStatus === 'connected'
                ? 'green.500'
                : connectionStatus === 'testing'
                  ? 'yellow.500'
                  : 'red.500'
            }
            flexShrink={0}
          />
        </HStack>
        {connectionError && (
          <Field.HelperText color="red.400" fontSize="xs" mt={1}>
            {connectionError}
          </Field.HelperText>
        )}
        {connectionStatus === 'connected' &&
          generationSettings.availableModels &&
          generationSettings.availableModels.length > 0 && (
            <Field.HelperText color="emerald.400" fontSize="xs" mt={1}>
              Connected! Found {generationSettings.availableModels.length}{' '}
              model(s)
            </Field.HelperText>
          )}
      </Field.Root>

      {!isZen && isRemoteProvider(generationSettings.baseURL) ? (
        <Field.Root>
          <Field.Label color="gray.300">API key (remote provider)</Field.Label>
          <Field.HelperText color="gray.500" fontSize="xs">
            Required for non-local providers
          </Field.HelperText>
          <Input
            type="password"
            value={generationSettings.apiKey || ''}
            onChange={(e) =>
              setGenerationSettings((prev) => ({
                ...prev,
                apiKey: e.target.value,
              }))
            }
            bg="rgba(255, 255, 255, 0.05)"
            borderColor="rgba(255, 255, 255, 0.1)"
            color="white"
            _focus={{ borderColor: 'emerald.400' }}
            fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
            placeholder="sk-..."
            autoComplete="off"
          />
        </Field.Root>
      ) : null}

      <Separator borderColor="rgba(255, 255, 255, 0.1)" />

      <Field.Root>
        <Field.Label color="gray.300">Model Name</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          {isZen
            ? 'Zen free models (get your API key at opencode.ai)'
            : 'OpenAI-compatible model to use for generation'}
        </Field.HelperText>
        {isZen ? (
          <NativeSelect.Root>
            <NativeSelect.Field
              value={generationSettings.modelName || ZEN_DEFAULT_MODEL_ID}
              onChange={(e) =>
                setGenerationSettings((prev) => ({
                  ...prev,
                  modelName: e.target.value,
                }))
              }
              bg="rgba(255, 255, 255, 0.05)"
              borderColor="rgba(255, 255, 255, 0.1)"
              color="white"
              _focus={{ borderColor: 'emerald.400' }}
            >
              {ZEN_FREE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        ) : generationSettings.availableModels &&
          generationSettings.availableModels.length > 0 ? (
          <NativeSelect.Root>
            <NativeSelect.Field
              value={generationSettings.modelName || ''}
              onChange={(e) =>
                setGenerationSettings((prev) => ({
                  ...prev,
                  modelName: e.target.value,
                }))
              }
              bg="rgba(255, 255, 255, 0.05)"
              borderColor="rgba(255, 255, 255, 0.1)"
              color="white"
              _focus={{ borderColor: 'emerald.400' }}
            >
              <option value="">Select a model</option>
              {generationSettings.availableModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        ) : (
          <Input
            value={generationSettings.modelName || 'gpt-5'}
            onChange={(e) =>
              setGenerationSettings((prev) => ({
                ...prev,
                modelName: e.target.value,
              }))
            }
            bg="rgba(255, 255, 255, 0.05)"
            borderColor="rgba(255, 255, 255, 0.1)"
            color="white"
            _focus={{ borderColor: 'emerald.400' }}
            fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
            placeholder="gpt-5"
          />
        )}
      </Field.Root>
    </>
  );
}
