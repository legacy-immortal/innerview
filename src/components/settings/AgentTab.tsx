/**
 * @file Settings tab for agent memory and guardrail middleware toggles.
 * @module components/settings/AgentTab.tsx
 */
import type { JSX } from 'react';
import { memo } from 'react';
import {
  VStack,
  HStack,
  Text,
  Separator,
  Switch,
  NativeSelect,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import type { GenerationSettings } from '@/lib/settings-types';
import {
  recommendEmbeddingComputeMode,
  type EmbeddingComputeMode,
} from '@/lib/embedding-capability';
import { detectPerformanceCached } from '@/lib/performance-detector';

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
  const [recommendedMode, setRecommendedMode] =
    useState<EmbeddingComputeMode | null>(null);

  useEffect(() => {
    let cancelled = false;
    void detectPerformanceCached()
      .then((metrics) => {
        if (cancelled) return;
        setRecommendedMode(recommendEmbeddingComputeMode(metrics));
      })
      .catch(() => {
        if (!cancelled) setRecommendedMode('server');
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

      <HStack justify="space-between" flexWrap="wrap" gap={3} align="start">
        <VStack align="start" gap={0} flex="1" minW="220px">
          <Text color="gray.200" fontSize="sm">
            Embedding Compute
          </Text>
          <Text color="gray.500" fontSize="xs">
            Cloud/server is default for smooth tablet UX. Client offload is
            opt-in and may be resource-intensive.
            {recommendedMode
              ? ` Recommended (device): ${recommendedMode}.`
              : ''}
          </Text>
        </VStack>
        <NativeSelect.Root size="sm" w={{ base: '100%', sm: '180px' }}>
          <NativeSelect.Field
            value={generationSettings.embeddingComputeMode ?? 'server'}
            onChange={(e) =>
              setGenerationSettings((prev) => ({
                ...prev,
                embeddingComputeMode: e.target
                  .value as GenerationSettings['embeddingComputeMode'],
              }))
            }
            bg="rgba(0, 0, 0, 0.3)"
            borderColor="rgba(255, 255, 255, 0.2)"
            color="gray.100"
          >
            <option value="server">Server (cloud, default)</option>
            <option value="client">Client (offload, opt-in)</option>
            <option value="disabled">Disabled</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator color="gray.400" />
        </NativeSelect.Root>
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
