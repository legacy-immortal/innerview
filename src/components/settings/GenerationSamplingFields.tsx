/**
 * @file Fields for generation sampling parameters (temperature, top-P, penalties, seed).
 * @module components/settings/GenerationSamplingFields.tsx
 */
// Sampling / penalty / stop / seed fields (extracted from GenerationTab.tsx).
import type { GenerationSettings } from '@/lib/settings-types';
import { Field, NumberInput, Separator, Textarea } from '@chakra-ui/react';
import type { Dispatch, SetStateAction, JSX } from 'react';

/**
 * Props for {@link GenerationSamplingFields}.
 */
export interface GenerationSamplingFieldsProps {
  /** Generation settings draft being edited (sampling parameters). */
  readonly generationSettings: GenerationSettings;
  /** Setter for the generation settings draft. */
  readonly setGenerationSettings: Dispatch<SetStateAction<GenerationSettings>>;
}

/**
 * Fields for generation sampling parameters (temperature, top-P, penalties, seed).
 *
 * Each field clamps to its provider-valid range and falls back to a sensible
 * default when the input is left empty. Extracted from {@link GenerationTab}.
 *
 * @see {@link GenerationSettings} for the underlying parameter ranges
 */
export function GenerationSamplingFields({
  generationSettings,
  setGenerationSettings,
}: GenerationSamplingFieldsProps): JSX.Element {
  return (
    <>
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
    </>
  );
}
