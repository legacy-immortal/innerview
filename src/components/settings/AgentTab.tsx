/**
 * @file Settings tab for agent memory and guardrail middleware toggles.
 * @module components/settings/AgentTab.tsx
 */
import type { JSX } from 'react';
import { memo } from 'react';
import { VStack, HStack, Text, Separator, Switch } from '@chakra-ui/react';
import type { GenerationSettings } from '@/lib/settings-types';

/**
 * Props for {@link AgentTab}.
 */
interface AgentTabProps {
  /** Generation settings draft being edited (agent memory & guardrails). */
  readonly generationSettings: GenerationSettings;
  /** Setter for the generation settings draft. */
  readonly setGenerationSettings: React.Dispatch<
    React.SetStateAction<GenerationSettings>
  >;
}

/**
 * Settings tab for agent memory and guardrail middleware toggles.
 *
 * Renders switches for associative memory, summary memory, constitution
 * middleware, and the appeal process. Consumed by the settings modal.
 */
export const AgentTab = memo(function AgentTab({
  generationSettings,
  setGenerationSettings,
}: AgentTabProps): JSX.Element {
  return (
    <VStack gap={4} align="stretch">
      <Text color="gray.300" fontSize="sm" fontWeight={600}>
        Memory & Guardrails
      </Text>
      <Text color="gray.500" fontSize="xs" mb={2}>
        Control agent memory systems and ethical guardrails
      </Text>

      <Separator borderColor="rgba(255, 255, 255, 0.1)" />

      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <VStack align="start" gap={0}>
          <Text color="gray.200" fontSize="sm">
            Enable Associative Memory
          </Text>
          <Text color="gray.500" fontSize="xs">
            Inject relevant memories from vector store into context
          </Text>
        </VStack>
        <Switch.Root
          checked={generationSettings.enableAssociativeMemory !== false}
          onCheckedChange={(details) => {
            const checked = details?.checked === true;
            setGenerationSettings((prev) => ({
              ...prev,
              enableAssociativeMemory: checked,
            }));
          }}
          colorPalette="emerald"
        >
          <Switch.HiddenInput />
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Root>
      </HStack>

      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <VStack align="start" gap={0}>
          <Text color="gray.200" fontSize="sm">
            Enable Summary Memory
          </Text>
          <Text color="gray.500" fontSize="xs">
            Automatically summarize long conversations
          </Text>
        </VStack>
        <Switch.Root
          checked={generationSettings.enableSummaryMemory !== false}
          onCheckedChange={(details) => {
            const checked = details?.checked === true;
            setGenerationSettings((prev) => ({
              ...prev,
              enableSummaryMemory: checked,
            }));
          }}
          colorPalette="emerald"
        >
          <Switch.HiddenInput />
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Root>
      </HStack>

      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <VStack align="start" gap={0}>
          <Text color="gray.200" fontSize="sm">
            Enable Constitution Middleware
          </Text>
          <Text color="gray.500" fontSize="xs">
            Apply constitutional AI principles to responses
          </Text>
        </VStack>
        <Switch.Root
          checked={generationSettings.enableConstitutionMiddleware !== false}
          onCheckedChange={(details) => {
            const checked = details?.checked === true;
            setGenerationSettings((prev) => ({
              ...prev,
              enableConstitutionMiddleware: checked,
            }));
          }}
          colorPalette="emerald"
        >
          <Switch.HiddenInput />
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Root>
      </HStack>

      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <VStack align="start" gap={0}>
          <Text color="gray.200" fontSize="sm">
            Enable Appeal Process
          </Text>
          <Text color="gray.500" fontSize="xs">
            Allow agent to appeal guardrails decisions
          </Text>
        </VStack>
        <Switch.Root
          checked={generationSettings.enableAppealProcess !== false}
          onCheckedChange={(details) => {
            const checked = details?.checked === true;
            setGenerationSettings((prev) => ({
              ...prev,
              enableAppealProcess: checked,
            }));
          }}
          colorPalette="emerald"
        >
          <Switch.HiddenInput />
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Root>
      </HStack>
    </VStack>
  );
});
