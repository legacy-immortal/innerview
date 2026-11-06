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
  NumberInput,
  Separator,
  Switch,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react';
import { memo, useCallback } from 'react';

const OPENAI_BASE_URL = 'https://api.openai.com/v1';

type ProviderPreset = 'custom' | 'openai' | 'zen';

function getProviderPreset(baseURL: string | undefined): ProviderPreset {
  const url = (baseURL || '').trim().replace(/\/+$/, '');
  if (url === ZEN_BASE_URL.replace(/\/+$/, '')) return 'zen';
  if (url === OPENAI_BASE_URL.replace(/\/+$/, '')) return 'openai';
  return 'custom';
}

interface GenerationTabProps {
  generationSettings: GenerationSettings;
  connectionStatus: 'idle' | 'testing' | 'connected' | 'error';
  connectionError: string | null;
  setGenerationSettings: React.Dispatch<
    React.SetStateAction<GenerationSettings>
  >;
  testConnection: () => void;
}

export const GenerationTab = memo(function GenerationTab({
  generationSettings,
  connectionStatus,
  connectionError,
  setGenerationSettings,
  testConnection,
}: GenerationTabProps) {
  const providerPreset = getProviderPreset(generationSettings.baseURL);
  const isZen = providerPreset === 'zen';

  const handlePresetChange = useCallback(
    (value: string) => {
      const preset = value as ProviderPreset;
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
    <VStack gap={4} align="stretch">
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
        <HStack justify="space-between" align="center">
          <Box>
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
        <HStack gap={2}>
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

      {!isZen &&
      (() => {
        try {
          const url = generationSettings.baseURL?.trim();
          if (!url) return false;
          const u = new URL(url);
          return u.hostname !== 'localhost' && u.hostname !== '127.0.0.1';
        } catch {
          return false;
        }
      })() ? (
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

      <Separator borderColor="rgba(255, 255, 255, 0.1)" />

      <Field.Root>
        <Field.Label color="gray.300">Temperature</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          Sampling temperature (0-2). Higher values make output more creative
          and random. Lower values make it more focused and deterministic.
        </Field.HelperText>
        <NumberInput.Root
          value={generationSettings.temperature?.toString() || '0.8'}
          min={0}
          max={2}
          step={0.1}
          onValueChange={(details) =>
            setGenerationSettings((prev) => ({
              ...prev,
              temperature: parseFloat(details.value) || 0.8,
            }))
          }
        >
          <NumberInput.Input
            bg="rgba(255, 255, 255, 0.05)"
            borderColor="rgba(255, 255, 255, 0.1)"
            color="white"
            _focus={{ borderColor: 'emerald.400' }}
          />
          <NumberInput.Control>
            <NumberInput.IncrementTrigger />
            <NumberInput.DecrementTrigger />
          </NumberInput.Control>
        </NumberInput.Root>
      </Field.Root>

      <Field.Root>
        <Field.Label color="gray.300">Max Tokens</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          Maximum number of tokens to generate in the response
        </Field.HelperText>
        <NumberInput.Root
          value={generationSettings.maxTokens?.toString() || '512'}
          min={1}
          max={4096}
          step={1}
          onValueChange={(details) =>
            setGenerationSettings((prev) => ({
              ...prev,
              maxTokens: parseInt(details.value) || 512,
            }))
          }
        >
          <NumberInput.Input
            bg="rgba(255, 255, 255, 0.05)"
            borderColor="rgba(255, 255, 255, 0.1)"
            color="white"
            _focus={{ borderColor: 'emerald.400' }}
          />
          <NumberInput.Control>
            <NumberInput.IncrementTrigger />
            <NumberInput.DecrementTrigger />
          </NumberInput.Control>
        </NumberInput.Root>
      </Field.Root>

      <Field.Root>
        <Field.Label color="gray.300">Top P</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          Nucleus sampling parameter (0-1). Controls diversity via nucleus
          sampling. 0.1 means only tokens with top 10% probability mass are
          considered.
        </Field.HelperText>
        <NumberInput.Root
          value={generationSettings.topP?.toString() || '1.0'}
          min={0}
          max={1}
          step={0.1}
          onValueChange={(details) =>
            setGenerationSettings((prev) => ({
              ...prev,
              topP: parseFloat(details.value) || 1.0,
            }))
          }
        >
          <NumberInput.Input
            bg="rgba(255, 255, 255, 0.05)"
            borderColor="rgba(255, 255, 255, 0.1)"
            color="white"
            _focus={{ borderColor: 'emerald.400' }}
          />
          <NumberInput.Control>
            <NumberInput.IncrementTrigger />
            <NumberInput.DecrementTrigger />
          </NumberInput.Control>
        </NumberInput.Root>
      </Field.Root>

      <Field.Root>
        <Field.Label color="gray.300">Top K</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          Top-K sampling parameter (1-100). Limits sampling to the top K most
          likely tokens. Leave empty to disable.
        </Field.HelperText>
        <NumberInput.Root
          value={generationSettings.topK?.toString() || ''}
          min={1}
          max={100}
          step={1}
          onValueChange={(details) =>
            setGenerationSettings((prev) => ({
              ...prev,
              topK:
                details.value && details.value !== ''
                  ? parseInt(details.value)
                  : undefined,
            }))
          }
        >
          <NumberInput.Input
            bg="rgba(255, 255, 255, 0.05)"
            borderColor="rgba(255, 255, 255, 0.1)"
            color="white"
            _focus={{ borderColor: 'emerald.400' }}
            placeholder="Disabled"
          />
          <NumberInput.Control>
            <NumberInput.IncrementTrigger />
            <NumberInput.DecrementTrigger />
          </NumberInput.Control>
        </NumberInput.Root>
      </Field.Root>

      <Field.Root>
        <Field.Label color="gray.300">Frequency Penalty</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          Frequency penalty (-2 to 2). Positive values penalize tokens based on
          their frequency in the text so far, reducing repetition.
        </Field.HelperText>
        <NumberInput.Root
          value={generationSettings.frequencyPenalty?.toString() || '0.0'}
          min={-2}
          max={2}
          step={0.1}
          onValueChange={(details) =>
            setGenerationSettings((prev) => ({
              ...prev,
              frequencyPenalty: parseFloat(details.value) || 0.0,
            }))
          }
        >
          <NumberInput.Input
            bg="rgba(255, 255, 255, 0.05)"
            borderColor="rgba(255, 255, 255, 0.1)"
            color="white"
            _focus={{ borderColor: 'emerald.400' }}
          />
          <NumberInput.Control>
            <NumberInput.IncrementTrigger />
            <NumberInput.DecrementTrigger />
          </NumberInput.Control>
        </NumberInput.Root>
      </Field.Root>

      <Field.Root>
        <Field.Label color="gray.300">Presence Penalty</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          Presence penalty (-2 to 2). Positive values penalize tokens based on
          whether they appear in the text so far, encouraging new topics.
        </Field.HelperText>
        <NumberInput.Root
          value={generationSettings.presencePenalty?.toString() || '0.0'}
          min={-2}
          max={2}
          step={0.1}
          onValueChange={(details) =>
            setGenerationSettings((prev) => ({
              ...prev,
              presencePenalty: parseFloat(details.value) || 0.0,
            }))
          }
        >
          <NumberInput.Input
            bg="rgba(255, 255, 255, 0.05)"
            borderColor="rgba(255, 255, 255, 0.1)"
            color="white"
            _focus={{ borderColor: 'emerald.400' }}
          />
          <NumberInput.Control>
            <NumberInput.IncrementTrigger />
            <NumberInput.DecrementTrigger />
          </NumberInput.Control>
        </NumberInput.Root>
      </Field.Root>

      <Separator borderColor="rgba(255, 255, 255, 0.1)" />

      <Field.Root>
        <Field.Label color="gray.300">Stop Sequences</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          Sequences that stop generation when encountered. Enter one per line or
          comma-separated. Leave empty to disable.
        </Field.HelperText>
        <Textarea
          value={generationSettings.stopSequences?.join('\n') || ''}
          onChange={(e) => {
            const value = e.target.value.trim();
            const sequences = value
              ? value
                  .split(/[,\n]/)
                  .map((s) => s.trim())
                  .filter((s) => s.length > 0)
              : [];
            setGenerationSettings((prev) => ({
              ...prev,
              stopSequences: sequences.length > 0 ? sequences : undefined,
            }));
          }}
          bg="rgba(255, 255, 255, 0.05)"
          borderColor="rgba(255, 255, 255, 0.1)"
          color="white"
          _focus={{ borderColor: 'emerald.400' }}
          fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
          placeholder="Enter stop sequences (one per line or comma-separated)"
          minH="80px"
          resize="vertical"
        />
      </Field.Root>

      <Field.Root>
        <Field.Label color="gray.300">Seed</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          Random seed for deterministic outputs. Use the same seed to get
          reproducible results. Leave empty for random generation.
        </Field.HelperText>
        <NumberInput.Root
          value={generationSettings.seed?.toString() || ''}
          min={0}
          max={2147483647}
          step={1}
          onValueChange={(details) =>
            setGenerationSettings((prev) => ({
              ...prev,
              seed:
                details.value && details.value !== ''
                  ? parseInt(details.value)
                  : undefined,
            }))
          }
        >
          <NumberInput.Input
            bg="rgba(255, 255, 255, 0.05)"
            borderColor="rgba(255, 255, 255, 0.1)"
            color="white"
            _focus={{ borderColor: 'emerald.400' }}
            placeholder="Random"
          />
          <NumberInput.Control>
            <NumberInput.IncrementTrigger />
            <NumberInput.DecrementTrigger />
          </NumberInput.Control>
        </NumberInput.Root>
      </Field.Root>
    </VStack>
  );
});
