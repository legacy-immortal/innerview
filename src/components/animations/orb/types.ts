/**
 * @file Props for the orb animation.
 */

/** Props accepted by the `Orb` component. */
export interface OrbProps {
  readonly hue?: number;
  readonly hoverIntensity?: number;
  readonly rotateOnHover?: boolean;
  readonly forceHoverState?: boolean;
}
