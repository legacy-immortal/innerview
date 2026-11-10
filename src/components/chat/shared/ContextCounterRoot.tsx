/**
 * @file ContextCounterRoot.tsx — Provider root wiring token state into the context counter tree.
 * @module components/chat/shared/ContextCounterRoot
 *
 * Provider root wiring token state into the context counter tree. Provides `usedTokens`,
 * `maxTokens`, `usage`, and `modelId` via React context and wraps children in `HoverCard.Root`.
 * Consumed by `ContextCounterContent`.
 */

import { HoverCard } from '@chakra-ui/react';
import type { ComponentProps, JSX } from 'react';
import { ContextContext, type ContextSchema } from './contextCounterUtils';

export type ContextProps = ComponentProps<typeof HoverCard.Root> &
  ContextSchema & {
    children: React.ReactNode;
  };

/**
 * Provider root wiring token state into the context counter tree.
 *
 * @param props - Context provider props.
 * @returns The provider element.
 */
export const Context = ({
  usedTokens,
  maxTokens,
  usage,
  modelId,
  children,
  ...props
}: ContextProps): JSX.Element => (
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
