/**
 * @file ContextCounterTrigger.tsx — Trigger button + icon for the context meter hover card.
 * @module components/chat/shared/ContextCounterTrigger
 *
 * Trigger button + icon for the context meter hover card. Exports `ContextIcon` (circular
 * usage gauge), `TokensWithCost`, and `ContextTrigger`. Consumed by `ContextCounterContent`.
 */

import { Button, HoverCard, Text } from '@chakra-ui/react';
import type { ComponentProps, JSX } from 'react';
import {
  ICON_CENTER,
  ICON_RADIUS,
  ICON_STROKE_WIDTH,
  ICON_VIEWBOX,
  useContextValue,
} from './contextCounterUtils';

/**
 * Circular usage icon for the context meter.
 *
 * @returns The context usage icon element (SVG ring).
 */
export const ContextIcon = (): JSX.Element => {
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

/**
 * Token count with optional cost text for the context meter.
 *
 * @param props - TokensWithCost props.
 * @returns The tokens/cost text element.
 */
export const TokensWithCost = ({
  tokens,
  costText,
  displayCost,
}: {
  readonly tokens?: number;
  readonly costText?: string;
  readonly displayCost?: boolean;
}): JSX.Element => (
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

export type ContextTriggerProps = ComponentProps<typeof Button>;

/**
 * Trigger button + icon for the context meter hover card.
 *
 * @param props - Button props passed through to the trigger.
 * @returns The trigger element.
 */
export const ContextTrigger = ({
  children,
  ...props
}: ContextTriggerProps): JSX.Element => {
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
