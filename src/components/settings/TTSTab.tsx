import { memo } from 'react';
import {
  VStack,
  Field,
  NativeSelect,
  NumberInput,
  Input,
} from '@chakra-ui/react';
import type { TTSSettings } from '@/lib/settings-types';
import {
  KOKORO_VOICES,
  SUPPORTED_KOKORO_MODELS,
} from '@/lib/tts/kokoro/kokoro-config';

interface TTSTabProps {
  ttsSettings: TTSSettings;
  browserVoices: SpeechSynthesisVoice[];
  updateTTSSetting: <K extends keyof TTSSettings>(
    key: K,
    value: TTSSettings[K]
  ) => void;
  updateKokoroSetting: <K extends keyof NonNullable<TTSSettings['kokoro']>>(
    key: K,
    value: NonNullable<TTSSettings['kokoro']>[K]
  ) => void;
  updateBrowserSetting: <K extends keyof NonNullable<TTSSettings['browser']>>(
    key: K,
    value: NonNullable<TTSSettings['browser']>[K]
  ) => void;
}

export const TTSTab = memo(function TTSTab({
  ttsSettings,
  browserVoices,
  updateTTSSetting,
  updateKokoroSetting,
  updateBrowserSetting,
}: TTSTabProps) {
  return (
    <VStack gap={4} align="stretch">
      <Field.Root>
        <Field.Label color="gray.300">TTS Provider</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          Select the TTS provider to use for voice synthesis
        </Field.HelperText>
        <NativeSelect.Root>
          <NativeSelect.Field
            value={ttsSettings.provider}
            onChange={(e) =>
              updateTTSSetting(
                'provider',
                e.currentTarget.value as TTSSettings['provider']
              )
            }
            bg="rgba(255, 255, 255, 0.05)"
            borderColor="rgba(255, 255, 255, 0.1)"
            color="white"
            _focus={{ borderColor: 'emerald.400' }}
          >
            <option value="kokoro">Kokoro (Local)</option>
            <option value="browser">Browser (Built-in)</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Field.Root>

      {ttsSettings.provider === 'kokoro' && (
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
              Kokoro model to use for synthesis
            </Field.HelperText>
            <NativeSelect.Root>
              <NativeSelect.Field
                value={ttsSettings.kokoro?.modelId || 'Kokoro-82M-v1.0-ONNX'}
                onChange={(e) =>
                  updateKokoroSetting('modelId', e.currentTarget.value)
                }
                bg="rgba(255, 255, 255, 0.05)"
                borderColor="rgba(255, 255, 255, 0.1)"
                color="white"
                _focus={{ borderColor: 'emerald.400' }}
              >
                {SUPPORTED_KOKORO_MODELS.map((model: string) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>

          <Field.Root>
            <Field.Label color="gray.300">Voice</Field.Label>
            <Field.HelperText color="gray.500" fontSize="xs">
              Voice to use for speech synthesis
            </Field.HelperText>
            <NativeSelect.Root>
              <NativeSelect.Field
                value={ttsSettings.kokoro?.defaultVoice || 'af_heart'}
                onChange={(e) =>
                  updateKokoroSetting('defaultVoice', e.currentTarget.value)
                }
                bg="rgba(255, 255, 255, 0.05)"
                borderColor="rgba(255, 255, 255, 0.1)"
                color="white"
                _focus={{ borderColor: 'emerald.400' }}
              >
                {KOKORO_VOICES.map((voice: string) => (
                  <option key={voice} value={voice}>
                    {voice}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>

          <Field.Root>
            <Field.Label color="gray.300">Speaking Rate</Field.Label>
            <Field.HelperText color="gray.500" fontSize="xs">
              Speed of speech (0.5 - 2.0)
            </Field.HelperText>
            <NumberInput.Root
              value={ttsSettings.kokoro?.speakingRate?.toString() || '1.0'}
              min={0.5}
              max={2.0}
              step={0.1}
              onValueChange={(details) =>
                updateKokoroSetting(
                  'speakingRate',
                  parseFloat(details.value) || 1.0
                )
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
            <Field.Label color="gray.300">Device</Field.Label>
            <Field.HelperText color="gray.500" fontSize="xs">
              Device to run the model on
            </Field.HelperText>
            <NativeSelect.Root>
              <NativeSelect.Field
                value={ttsSettings.kokoro?.device || 'wasm'}
                onChange={(e) =>
                  updateKokoroSetting(
                    'device',
                    e.currentTarget.value as 'wasm' | 'webgpu'
                  )
                }
                bg="rgba(255, 255, 255, 0.05)"
                borderColor="rgba(255, 255, 255, 0.1)"
                color="white"
                _focus={{ borderColor: 'emerald.400' }}
              >
                <option value="wasm">WebAssembly (WASM)</option>
                <option value="webgpu">WebGPU</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>

          <Field.Root>
            <Field.Label color="gray.300">Quantization</Field.Label>
            <Field.HelperText color="gray.500" fontSize="xs">
              Model quantization type
            </Field.HelperText>
            <NativeSelect.Root>
              <NativeSelect.Field
                value={ttsSettings.kokoro?.dtype || 'q8'}
                onChange={(e) =>
                  updateKokoroSetting(
                    'dtype',
                    e.currentTarget.value as
                      | 'q8'
                      | 'fp32'
                      | 'fp16'
                      | 'q4'
                      | 'q4f16'
                  )
                }
                bg="rgba(255, 255, 255, 0.05)"
                borderColor="rgba(255, 255, 255, 0.1)"
                color="white"
                _focus={{ borderColor: 'emerald.400' }}
              >
                <option value="q8">Q8 (Recommended)</option>
                <option value="fp32">FP32 (Full precision)</option>
                <option value="fp16">FP16 (Half precision)</option>
                <option value="q4">Q4 (Lower quality)</option>
                <option value="q4f16">Q4F16</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>
        </VStack>
      )}

      {ttsSettings.provider === 'browser' && (
        <VStack
          gap={3}
          align="stretch"
          pl={4}
          borderLeft="1px solid"
          borderColor="rgba(255, 255, 255, 0.1)"
        >
          <Field.Root>
            <Field.Label color="gray.300">Voice</Field.Label>
            <Field.HelperText color="gray.500" fontSize="xs">
              Browser voice to use for speech synthesis
            </Field.HelperText>
            <NativeSelect.Root>
              <NativeSelect.Field
                value={ttsSettings.browser?.defaultVoice || ''}
                onChange={(e) =>
                  updateBrowserSetting('defaultVoice', e.currentTarget.value)
                }
                bg="rgba(255, 255, 255, 0.05)"
                borderColor="rgba(255, 255, 255, 0.1)"
                color="white"
                _focus={{ borderColor: 'emerald.400' }}
              >
                <option value="">Default</option>
                {browserVoices.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>

          <Field.Root>
            <Field.Label color="gray.300">Rate</Field.Label>
            <Field.HelperText color="gray.500" fontSize="xs">
              Speech rate (0.1 - 10.0)
            </Field.HelperText>
            <NumberInput.Root
              value={ttsSettings.browser?.rate?.toString() || '1.0'}
              min={0.1}
              max={10.0}
              step={0.1}
              onValueChange={(details) =>
                updateBrowserSetting('rate', parseFloat(details.value) || 1.0)
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
            <Field.Label color="gray.300">Pitch</Field.Label>
            <Field.HelperText color="gray.500" fontSize="xs">
              Voice pitch (0.0 - 2.0)
            </Field.HelperText>
            <NumberInput.Root
              value={ttsSettings.browser?.pitch?.toString() || '1.0'}
              min={0.0}
              max={2.0}
              step={0.1}
              onValueChange={(details) =>
                updateBrowserSetting('pitch', parseFloat(details.value) || 1.0)
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
            <Field.Label color="gray.300">Volume</Field.Label>
            <Field.HelperText color="gray.500" fontSize="xs">
              Speech volume (0.0 - 1.0)
            </Field.HelperText>
            <NumberInput.Root
              value={ttsSettings.browser?.volume?.toString() || '1.0'}
              min={0.0}
              max={1.0}
              step={0.1}
              onValueChange={(details) =>
                updateBrowserSetting('volume', parseFloat(details.value) || 1.0)
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
            <Field.Label color="gray.300">Language</Field.Label>
            <Field.HelperText color="gray.500" fontSize="xs">
              Language code (e.g., en-US, es-ES)
            </Field.HelperText>
            <Input
              value={ttsSettings.browser?.lang || ''}
              onChange={(e) =>
                updateBrowserSetting('lang', e.currentTarget.value)
              }
              bg="rgba(255, 255, 255, 0.05)"
              borderColor="rgba(255, 255, 255, 0.1)"
              color="white"
              _focus={{ borderColor: 'emerald.400' }}
              placeholder="en-US"
            />
          </Field.Root>
        </VStack>
      )}
    </VStack>
  );
});
