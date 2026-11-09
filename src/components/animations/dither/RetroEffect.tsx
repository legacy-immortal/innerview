import { wrapEffect } from '@react-three/postprocessing';
import { Effect } from 'postprocessing';
import { forwardRef } from 'react';
import type { ComponentType, Ref } from 'react';
import * as THREE from 'three';
import { DITHER_FRAGMENT_SHADER } from './shaders';

/**
 * @file Retro dither post-processing effect — a `postprocessing` Effect that
 * quantizes the framebuffer into `colorNum` levels with a Bayer dither.
 */

/** Props accepted by the retro dither effect element. */
export interface RetroEffectProps {
  readonly colorNum: number;
  readonly pixelSize: number;
}

/**
 * Post-processing effect implementing the retro Bayer dither. Uniform values
 * are encapsulated behind null-safe public accessors so callers never need
 * to reach into the uniforms map directly.
 */
export class RetroEffectImpl extends Effect {
  private readonly uniformsMap: Map<string, THREE.Uniform<number>>;

  /**
   * Create the retro dither effect with default uniform values.
   */
  constructor() {
    const uniformsMap = new Map<string, THREE.Uniform<number>>([
      ['colorNum', new THREE.Uniform(4.0)],
      ['pixelSize', new THREE.Uniform(2.0)],
    ]);
    super('RetroEffect', DITHER_FRAGMENT_SHADER, { uniforms: uniformsMap });
    this.uniformsMap = uniformsMap;
  }

  /**
   * Get the number of quantized color levels.
   * @returns The current `colorNum` uniform value, or the default of 4.
   */
  public get colorNum(): number {
    return this.readUniform('colorNum', 4);
  }

  /**
   * Set the number of quantized color levels.
   * @param value - The `colorNum` uniform value to write.
   */
  public set colorNum(value: number) {
    this.writeUniform('colorNum', value);
  }

  /**
   * Get the retro pixel size in pixels.
   * @returns The current `pixelSize` uniform value, or the default of 2.
   */
  public get pixelSize(): number {
    return this.readUniform('pixelSize', 2);
  }

  /**
   * Set the retro pixel size in pixels.
   * @param value - The `pixelSize` uniform value to write.
   */
  public set pixelSize(value: number) {
    this.writeUniform('pixelSize', value);
  }

  /**
   * Read a numeric uniform.
   * @param key - The uniform name.
   * @param fallback - Value to return when the uniform is missing.
   * @returns The uniform value.
   */
  private readUniform(key: string, fallback: number): number {
    return this.uniformsMap.get(key)?.value ?? fallback;
  }

  /**
   * Write a numeric uniform.
   * @param key - The uniform name.
   * @param value - The value to write.
   */
  private writeUniform(key: string, value: number): void {
    const uniform = this.uniformsMap.get(key);
    if (uniform) {
      uniform.value = value;
    }
  }
}

// Wrap the effect outside the component to avoid recreating on every render
const WrappedRetroEffectImpl = wrapEffect(RetroEffectImpl);

/**
 * Typed element for the wrapped retro effect. `wrapEffect` only exposes a
 * generic wrapper type, so the constructor-param props are re-attached
 * explicitly here; runtime behavior is unchanged.
 */
const WrappedRetroEffect = WrappedRetroEffectImpl as ComponentType<
  RetroEffectProps & { ref?: Ref<RetroEffectImpl> }
>;

/**
 * Retro dither effect element for use inside a post-processing canvas.
 * @param props - Effect props (`colorNum`, `pixelSize`).
 * @param ref - Forwarded ref to the underlying effect instance.
 * @returns The wrapped effect element.
 */
export const RetroEffect = forwardRef<RetroEffectImpl, RetroEffectProps>(
  (props, ref) => {
    const { colorNum, pixelSize } = props;
    return (
      <WrappedRetroEffect ref={ref} colorNum={colorNum} pixelSize={pixelSize} />
    );
  }
);

RetroEffect.displayName = 'RetroEffect';
