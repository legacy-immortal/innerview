/**
 * @file ContextCounterUsage.tsx — Usage rows (input/output/reasoning/cache) for the context meter.
 * @module components/chat/shared/ContextCounterUsage
 *
 * Usage rows (input/output/reasoning/cache) for the context meter. Each row resolves its token
 * count and estimated USD cost via `getCostUSD`, returning `null` when there is no usage to
 * show. Consumed by `ContextCounterContent`.
 */

import { Box, HStack, Text } from '@chakra-ui/react';
import type { ComponentProps, JSX } from 'react';
import { TokensWithCost } from './ContextCounterTrigger';
import {
  formatCurrency,
  getCostUSD,
  useContextValue,
} from './contextCounterUtils';

export type ContextInputUsageProps = ComponentProps<typeof Box>;

/**
 * Input usage row for the context meter.
 *
 * @param props - Box props passed through to the root element.
 * @returns The usage row element, or `null` when there is no input usage.
 */
export const ContextInputUsage = ({
  className,
  children,
  ...props
}: ContextInputUsageProps): JSX.Element | null => {
  const { usage, modelId } = useContextValue();
  const inputTokens = usage?.inputTokens ?? 0;

  if (children) {
    return <>{children}</>;
  }

  if (!inputTokens) {
    return null;
  }

  const inputCost = getCostUSD(modelId, { input: inputTokens, output: 0 });
  const inputCostText = formatCurrency(inputCost ?? 0);

  return (
    <Box
      fontSize="xs"
      fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
      {...props}
      className={className}
    >
      <HStack justify="space-between">
        <Text
          color="gray.400"
          fontFamily="inherit"
          css={{
            textShadow: '0 0 4px rgba(255, 255, 255, 0.08)',
          }}
        >
          Input
        </Text>
        <TokensWithCost costText={inputCostText} tokens={inputTokens} />
      </HStack>
    </Box>
  );
};

export type ContextOutputUsageProps = ComponentProps<typeof Box>;

/**
 * Output usage row for the context meter.
 *
 * @param props - Box props passed through to the root element.
 * @returns The usage row element, or `null` when there is no output usage.
 */
export const ContextOutputUsage = ({
  className,
  children,
  ...props
}: ContextOutputUsageProps): JSX.Element | null => {
  const { usage, modelId } = useContextValue();
  const outputTokens = usage?.outputTokens ?? 0;

  if (children) {
    return <>{children}</>;
  }

  if (!outputTokens) {
    return null;
  }

  const outputCost = getCostUSD(modelId, { input: 0, output: outputTokens });
  const outputCostText = formatCurrency(outputCost ?? 0);

  return (
    <Box
      fontSize="xs"
      fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
      {...props}
      className={className}
    >
      <HStack justify="space-between">
        <Text
          color="gray.400"
          fontFamily="inherit"
          css={{
            textShadow: '0 0 4px rgba(255, 255, 255, 0.08)',
          }}
        >
          Output
        </Text>
        <TokensWithCost costText={outputCostText} tokens={outputTokens} />
      </HStack>
    </Box>
  );
};

export type ContextReasoningUsageProps = ComponentProps<typeof Box>;

/**
 * Reasoning usage row for the context meter.
 *
 * @param props - Box props passed through to the root element.
 * @returns The usage row element, or `null` when there is no reasoning usage.
 */
export const ContextReasoningUsage = ({
  className,
  children,
  ...props
}: ContextReasoningUsageProps): JSX.Element | null => {
  const { usage, modelId } = useContextValue();
  const reasoningTokens = usage?.reasoningTokens ?? 0;

  if (children) {
    return <>{children}</>;
  }

  if (!reasoningTokens) {
    return null;
  }

  const reasoningCost = getCostUSD(modelId, { reasoningTokens });
  const reasoningCostText = formatCurrency(reasoningCost ?? 0);

  return (
    <Box
      fontSize="xs"
      fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
      {...props}
      className={className}
    >
      <HStack justify="space-between">
        <Text
          color="gray.400"
          fontFamily="inherit"
          css={{
            textShadow: '0 0 4px rgba(255, 255, 255, 0.08)',
          }}
        >
          Reasoning
        </Text>
        <TokensWithCost costText={reasoningCostText} tokens={reasoningTokens} />
      </HStack>
    </Box>
  );
};

export type ContextCacheUsageProps = ComponentProps<typeof Box>;

/**
 * Cache usage row for the context meter.
 *
 * @param props - Box props passed through to the root element.
 * @returns The usage row element, or `null` when there is no cache usage.
 */
export const ContextCacheUsage = ({
  className,
  children,
  ...props
}: ContextCacheUsageProps): JSX.Element | null => {
  const { usage, modelId } = useContextValue();
  const cacheTokens = usage?.cachedInputTokens ?? 0;

  if (children) {
    return <>{children}</>;
  }

  if (!cacheTokens) {
    return null;
  }

  const cacheCost = getCostUSD(modelId, {
    cacheReads: cacheTokens,
    input: 0,
    output: 0,
  });
  const cacheCostText = formatCurrency(cacheCost ?? 0);

  return (
    <Box
      fontSize="xs"
      fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
      {...props}
      className={className}
    >
      <HStack justify="space-between">
        <Text
          color="gray.400"
          fontFamily="inherit"
          css={{
            textShadow: '0 0 4px rgba(255, 255, 255, 0.08)',
          }}
        >
          Cache
        </Text>
        <TokensWithCost
          costText={cacheCostText}
          tokens={cacheTokens}
          displayCost={false}
        />
      </HStack>
    </Box>
  );
};
