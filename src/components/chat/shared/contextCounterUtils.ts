/**
 * @file contextCounterUtils.ts — Context counter contracts and number formatting.
 * @module components/chat/shared/contextCounterUtils
 *
 * Owns the React context carrying token-usage state plus typed formatters (percent, compact,
 * currency) shared by the ContextCounter components. All exported helpers carry explicit return
 * types per Microsoft style. Consumed across the context-counter component family.
 */

import type { LanguageModelUsage } from 'ai';
import { createContext, useContext } from 'react';
import { getUsage } from 'tokenlens';

/** Upper bound of a percentage value. */
export const PERCENT_MAX = 100;

/** Geometry constants for the context icon glyph. */
export const ICON_RADIUS = 10;
export const ICON_VIEWBOX = 24;
export const ICON_CENTER = 12;
export const ICON_STROKE_WIDTH = 2;

/** Brand identifier (model id) used for pricing lookups. */
export type ModelId = string;

/** Token-usage state shared through the context counter tree. */
export interface ContextSchema {
  readonly usedTokens: number;
  readonly maxTokens: number;
  readonly usage?: LanguageModelUsage;
  readonly modelId?: ModelId;
}

/** React context carrying the active {@link ContextSchema}; `null` outside a provider. */
export const ContextContext = createContext<ContextSchema | null>(null);

/**
 * Reads the surrounding {@link ContextContext}.
 *
 * @returns The active context schema.
 * @throws If rendered outside a `Context` provider.
 */
export const useContextValue = (): ContextSchema => {
  const context = useContext(ContextContext);

  if (!context) {
    throw new Error('Context components must be used within Context');
  }

  return context;
};

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
});

const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
});

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

/**
 * Formats a fraction (0–1) as a percentage string.
 *
 * @param value Fraction to format.
 * @returns Localised percentage string.
 */
export const formatPercent = (value: number): string =>
  percentFormatter.format(value);

/**
 * Formats a number in compact notation (e.g. `1.2K`).
 *
 * @param value Number to format.
 * @returns Compact string representation.
 */
export const formatCompact = (value: number): string =>
  compactFormatter.format(value);

/**
 * Formats a USD amount as currency.
 *
 * @param value Amount in dollars.
 * @returns Localised currency string.
 */
export const formatCurrency = (value: number): string =>
  currencyFormatter.format(value);

/** Usage slice accepted by {@link getCostUSD} for pricing lookups. */
export interface CostUsage {
  readonly input?: number;
  readonly output?: number;
  readonly reasoningTokens?: number;
  readonly cacheReads?: number;
}

/**
 * Resolves the estimated USD cost for a model + usage slice.
 *
 * @param modelId Model identifier, or `undefined` when unknown.
 * @param usage Token usage breakdown.
 * @returns Total estimated cost in USD, or `undefined` when unavailable.
 */
export const getCostUSD = (
  modelId: ModelId | undefined,
  usage: CostUsage
): number | undefined => {
  if (!modelId) return undefined;
  return getUsage({ modelId, usage }).costUSD?.totalUSD;
};
