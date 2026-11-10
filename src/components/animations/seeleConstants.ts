/**
 * @file seeleConstants.ts — shared SEELE font options and default texts.
 * @module components/animations/seeleConstants
 *
 * Centralizes the SEELE display's font-family options and default top/bottom
 * text so `Seele.tsx` only exports components (keeping fast-refresh
 * friendly) while existing imports from `Seele` continue to resolve via
 * re-export.
 */

/** A labeled CSS font-family option for the SEELE display. */
export interface FontOption {
  readonly value: string;
  readonly label: string;
}

/** Sans-serif font options for SEELE display (value is CSS font-family). */
export const SEELE_FONT_OPTIONS: readonly FontOption[] = [
  { value: 'Inter, system-ui, sans-serif', label: 'Inter' },
  { value: 'Roboto, system-ui, sans-serif', label: 'Roboto' },
  { value: '"Open Sans", system-ui, sans-serif', label: 'Open Sans' },
  { value: '"Segoe UI", system-ui, sans-serif', label: 'Segoe UI' },
  { value: 'Arial, Helvetica, sans-serif', label: 'Arial' },
  { value: '"Source Sans 3", system-ui, sans-serif', label: 'Source Sans 3' },
  {
    value: 'Consolas, "Courier New", monospace',
    label: 'Consolas (monospace)',
  },
];

/** Default header text for the SEELE display. */
export const SEELE_DEFAULT_TOP_TEXT = 'SEELE';

/** Default footer text for the SEELE display. */
export const SEELE_DEFAULT_BOTTOM_TEXT = 'SOUND ONLY';
