/**
 * @file ContextCounterContent.tsx — Hover-card content (header, body, footer) for the context meter.
 * @module components/chat/shared/ContextCounterContent
 *
 * Hover-card content (header, body, footer) for the context meter. Renders the percent bar,
 * input/output/reasoning/cache usage rows, and total cost. Consumed by `ContextCounterTrigger`.
 */

import {
  Box,
  HStack,
  HoverCard,
  Progress,
  Text,
  VStack,
} from '@chakra-ui/react';
import type { ComponentProps, JSX } from 'react';
import {
  PERCENT_MAX,
  formatCompact,
  formatCurrency,
  formatPercent,
  getCostUSD,
  useContextValue,
} from './contextCounterUtils';

export type ContextContentProps = ComponentProps<typeof HoverCard.Content>;

/**
 * Hover-card content panel for the context meter.
 *
 * @param props - Context content props.
 * @returns The content element.
 */
export const ContextContent = ({
  className,
  ...props
}: ContextContentProps): JSX.Element => (
  <HoverCard.Content
    minW={{ base: 'min(240px, calc(100vw - 2rem))', md: '240px' }}
    maxW="calc(100vw - 2rem)"
    p={0}
    overflow="hidden"
    bg="transparent"
    border="1px solid"
    borderColor="rgba(255, 255, 255, 0.1)"
    borderRadius="none"
    fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
    fontSize="sm"
    {...props}
    className={className}
    css={{
      backdropFilter: 'blur(8px)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      animation: 'none !important',
      animationName: 'none !important',
      transform: 'none !important',
      transformOrigin: 'top center !important',
    }}
  />
);

export type ContextContentHeaderProps = ComponentProps<typeof Box>;

/**
 * Header section of the context meter hover card.
 *
 * @param props - Box props passed through to the root element.
 * @returns The header element.
 */
export const ContextContentHeader = ({
  children,
  className,
  ...props
}: ContextContentHeaderProps): JSX.Element => {
  const { usedTokens, maxTokens } = useContextValue();
  const usedPercent = usedTokens / maxTokens;
  const displayPct = formatPercent(usedPercent);
  const used = formatCompact(usedTokens);
  const total = formatCompact(maxTokens);

  return (
    <Box
      w="100%"
      p={3}
      fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
      {...props}
      className={className}
    >
      {children ?? (
        <VStack gap={2} align="stretch">
          <HStack justify="space-between" gap={3}>
            <Text
              fontSize="xs"
              fontFamily="inherit"
              css={{
                textShadow: '0 0 4px rgba(255, 255, 255, 0.1)',
              }}
            >
              {displayPct}
            </Text>
            <Text
              fontSize="xs"
              fontFamily="inherit"
              color="gray.400"
              css={{
                textShadow: '0 0 4px rgba(255, 255, 255, 0.08)',
              }}
            >
              {used} / {total}
            </Text>
          </HStack>
          <Progress.Root
            value={usedPercent * PERCENT_MAX}
            colorPalette="cyan"
            size="sm"
            css={{
              '& [data-part="track"]': {
                bg: 'rgba(255, 255, 255, 0.1)',
              },
              '& [data-part="range"]': {
                bg: 'rgba(34, 211, 238, 0.6)',
                boxShadow: '0 0 8px rgba(34, 211, 238, 0.4)',
              },
            }}
          >
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
        </VStack>
      )}
    </Box>
  );
};

export type ContextContentBodyProps = ComponentProps<typeof Box>;

/**
 * Body section of the context meter hover card.
 *
 * @param props - Box props passed through to the root element.
 * @returns The body element.
 */
export const ContextContentBody = ({
  children,
  className,
  ...props
}: ContextContentBodyProps): JSX.Element => (
  <Box
    w="100%"
    p={3}
    fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
    {...props}
    className={className}
  >
    {children}
  </Box>
);

export type ContextContentFooterProps = ComponentProps<typeof Box>;

/**
 * Footer section of the context meter hover card (total cost).
 *
 * @param props - Box props passed through to the root element.
 * @returns The footer element.
 */
export const ContextContentFooter = ({
  children,
  className,
  ...props
}: ContextContentFooterProps): JSX.Element => {
  const { modelId, usage } = useContextValue();
  const costUSD = getCostUSD(modelId, {
    input: usage?.inputTokens ?? 0,
    output: usage?.outputTokens ?? 0,
  });
  const totalCost = formatCurrency(costUSD ?? 0);

  return (
    <Box
      w="100%"
      p={3}
      bg="rgba(0, 0, 0, 0.3)"
      fontSize="xs"
      borderTop="1px solid"
      borderColor="rgba(255, 255, 255, 0.1)"
      fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
      {...props}
      className={className}
    >
      {children ?? (
        <HStack justify="space-between" gap={3}>
          <Text
            color="gray.400"
            fontFamily="inherit"
            css={{
              textShadow: '0 0 4px rgba(255, 255, 255, 0.08)',
            }}
          >
            Total cost
          </Text>
          <Text
            fontFamily="inherit"
            css={{
              textShadow: '0 0 4px rgba(255, 255, 255, 0.1)',
            }}
          >
            {totalCost}
          </Text>
        </HStack>
      )}
    </Box>
  );
};
