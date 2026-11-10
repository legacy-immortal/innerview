/**
 * @file ContextCounter.tsx — Public facade for the context-counter component family.
 * @module components/chat/shared/ContextCounter
 *
 * Public facade for the context-counter component family. Re-exports `Context`, content
 * sections, trigger, and usage rows from their respective modules so consumers import from a
 * single entry point. Consumed by `ChatInput` and `CorpoLayout`.
 */

export { Context, type ContextProps } from './ContextCounterRoot';
export {
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextContentHeader,
  type ContextContentBodyProps,
  type ContextContentFooterProps,
  type ContextContentHeaderProps,
  type ContextContentProps,
} from './ContextCounterContent';
export {
  ContextTrigger,
  type ContextTriggerProps,
} from './ContextCounterTrigger';
export {
  ContextCacheUsage,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  type ContextCacheUsageProps,
  type ContextInputUsageProps,
  type ContextOutputUsageProps,
  type ContextReasoningUsageProps,
} from './ContextCounterUsage';
