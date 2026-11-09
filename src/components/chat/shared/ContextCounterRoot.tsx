/**
 * ContextCounterRoot.tsx — Provider root wiring token state into the context counter tree.
 *
 * @module components/chat/shared/ContextCounterRoot
 */

import { HoverCard } from '@chakra-ui/react';
import type { ComponentProps } from 'react';
import { ContextContext, type ContextSchema } from './contextCounterUtils';

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
