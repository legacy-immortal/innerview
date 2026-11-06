import {
  Box,
  Button,
  HStack,
  HoverCard,
  Progress,
  Text,
  VStack,
} from '@chakra-ui/react';
import type { LanguageModelUsage } from 'ai';
import React, { createContext, useContext, type ComponentProps } from 'react';
import { getUsage } from 'tokenlens';

const PERCENT_MAX = 100;
const ICON_RADIUS = 10;
const ICON_VIEWBOX = 24;
const ICON_CENTER = 12;
const ICON_STROKE_WIDTH = 2;

type ModelId = string;

type ContextSchema = {
  usedTokens: number;
  maxTokens: number;
  usage?: LanguageModelUsage;
  modelId?: ModelId;
};

const ContextContext = createContext<ContextSchema | null>(null);

const useContextValue = () => {
  const context = useContext(ContextContext);

  if (!context) {
    throw new Error('Context components must be used within Context');
  }

  return context;
};

export type ContextProps = ComponentProps<typeof HoverCard.Root> &
  ContextSchema & {
    children: React.ReactNode;
  };

export const Context = ({
  usedTokens,
  maxTokens,
  usage,
  modelId,
  children,
  ...props
}: ContextProps) => (
  <ContextContext.Provider
    value={{
      usedTokens,
      maxTokens,
      usage,
      modelId,
    }}
  >
    <HoverCard.Root closeDelay={0} openDelay={0} {...props}>
      {children}
    </HoverCard.Root>
  </ContextContext.Provider>
);

const ContextIcon = () => {
  const { usedTokens, maxTokens } = useContextValue();
  const circumference = 2 * Math.PI * ICON_RADIUS;
  const usedPercent = usedTokens / maxTokens;
  const dashOffset = circumference * (1 - usedPercent);
  const isHighUsage = usedPercent > 0.8;

  return (
    <svg
      aria-label="Model context usage"
      height="20"
      role="img"
      style={{ color: 'currentcolor' }}
      viewBox={`0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}`}
      width="20"
    >
      <circle
        cx={ICON_CENTER}
        cy={ICON_CENTER}
        fill="none"
        opacity="0.25"
        r={ICON_RADIUS}
        stroke="currentColor"
        strokeWidth={ICON_STROKE_WIDTH}
      />
      <circle
        cx={ICON_CENTER}
        cy={ICON_CENTER}
        fill="none"
        opacity={isHighUsage ? '0.9' : '0.7'}
        r={ICON_RADIUS}
        stroke={isHighUsage ? '#22d3ee' : 'currentColor'}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        strokeWidth={ICON_STROKE_WIDTH}
        style={{
          transformOrigin: 'center',
          transform: 'rotate(-90deg)',
          filter: isHighUsage
            ? 'drop-shadow(0 0 4px rgba(34, 211, 238, 0.6))'
            : 'none',
        }}
      />
    </svg>
  );
};

export type ContextTriggerProps = ComponentProps<typeof Button>;

export const ContextTrigger = ({ children, ...props }: ContextTriggerProps) => {
  const { usedTokens, maxTokens } = useContextValue();
  const usedPercent = usedTokens / maxTokens;
  const renderedPercent = new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(usedPercent);

  return (
    <HoverCard.Trigger asChild>
      {children ?? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          colorPalette="gray"
          fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
          fontSize="xs"
          {...props}
          css={{
            textShadow: '0 0 4px rgba(255, 255, 255, 0.1)',
          }}
        >
          <Text
            fontSize="xs"
            fontWeight="medium"
            color="gray.400"
            fontFamily="inherit"
            css={{
              textShadow: '0 0 4px rgba(255, 255, 255, 0.08)',
            }}
          >
            {renderedPercent}
          </Text>
          <ContextIcon />
        </Button>
      )}
    </HoverCard.Trigger>
  );
};

export type ContextContentProps = ComponentProps<typeof HoverCard.Content>;

export const ContextContent = ({
  className,
  ...props
}: ContextContentProps) => (
  <HoverCard.Content
    minW="240px"
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

export const ContextContentHeader = ({
  children,
  className,
  ...props
}: ContextContentHeaderProps) => {
  const { usedTokens, maxTokens } = useContextValue();
  const usedPercent = usedTokens / maxTokens;
  const displayPct = new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(usedPercent);
  const used = new Intl.NumberFormat('en-US', {
    notation: 'compact',
  }).format(usedTokens);
  const total = new Intl.NumberFormat('en-US', {
    notation: 'compact',
  }).format(maxTokens);

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

export const ContextContentBody = ({
  children,
  className,
  ...props
}: ContextContentBodyProps) => (
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

export const ContextContentFooter = ({
  children,
  className,
  ...props
}: ContextContentFooterProps) => {
  const { modelId, usage } = useContextValue();
  const costUSD = modelId
    ? getUsage({
        modelId,
        usage: {
          input: usage?.inputTokens ?? 0,
          output: usage?.outputTokens ?? 0,
        },
      }).costUSD?.totalUSD
    : undefined;
  const totalCost = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(costUSD ?? 0);

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

export type ContextInputUsageProps = ComponentProps<typeof Box>;

export const ContextInputUsage = ({
  className,
  children,
  ...props
}: ContextInputUsageProps) => {
  const { usage, modelId } = useContextValue();
  const inputTokens = usage?.inputTokens ?? 0;

  if (children) {
    return <>{children}</>;
  }

  if (!inputTokens) {
    return null;
  }

  const inputCost = modelId
    ? getUsage({
        modelId,
        usage: { input: inputTokens, output: 0 },
      }).costUSD?.totalUSD
    : undefined;
  const inputCostText = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(inputCost ?? 0);

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

export const ContextOutputUsage = ({
  className,
  children,
  ...props
}: ContextOutputUsageProps) => {
  const { usage, modelId } = useContextValue();
  const outputTokens = usage?.outputTokens ?? 0;

  if (children) {
    return <>{children}</>;
  }

  if (!outputTokens) {
    return null;
  }

  const outputCost = modelId
    ? getUsage({
        modelId,
        usage: { input: 0, output: outputTokens },
      }).costUSD?.totalUSD
    : undefined;
  const outputCostText = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(outputCost ?? 0);

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

export const ContextReasoningUsage = ({
  className,
  children,
  ...props
}: ContextReasoningUsageProps) => {
  const { usage, modelId } = useContextValue();
  const reasoningTokens = usage?.reasoningTokens ?? 0;

  if (children) {
    return <>{children}</>;
  }

  if (!reasoningTokens) {
    return null;
  }

  const reasoningCost = modelId
    ? getUsage({
        modelId,
        usage: { reasoningTokens },
      }).costUSD?.totalUSD
    : undefined;
  const reasoningCostText = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(reasoningCost ?? 0);

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

export const ContextCacheUsage = ({
  className,
  children,
  ...props
}: ContextCacheUsageProps) => {
  const { usage, modelId } = useContextValue();
  const cacheTokens = usage?.cachedInputTokens ?? 0;

  if (children) {
    return <>{children}</>;
  }

  if (!cacheTokens) {
    return null;
  }

  const cacheCost = modelId
    ? getUsage({
        modelId,
        usage: { cacheReads: cacheTokens, input: 0, output: 0 },
      }).costUSD?.totalUSD
    : undefined;
  const cacheCostText = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cacheCost ?? 0);

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

const TokensWithCost = ({
  tokens,
  costText,
  displayCost,
}: {
  tokens?: number;
  costText?: string;
  displayCost?: boolean;
}) => (
  <Text
    fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
    css={{
      textShadow: '0 0 4px rgba(255, 255, 255, 0.1)',
    }}
  >
    {tokens === undefined
      ? '—'
      : new Intl.NumberFormat('en-US', {
          notation: 'compact',
        }).format(tokens)}
    {displayCost && costText && (
      <Text
        as="span"
        ml={2}
        color="gray.400"
        fontFamily="inherit"
        css={{
          textShadow: '0 0 4px rgba(255, 255, 255, 0.08)',
        }}
      >
        • {costText}
      </Text>
    )}
  </Text>
);
