/**
 * @file Props for the threads animation.
 */

/** Props accepted by the `Threads` component. */
export interface ThreadsProps {
  readonly color?: readonly [number, number, number];
  readonly amplitude?: number;
  readonly distance?: number;
  readonly enableMouseInteraction?: boolean;
}
