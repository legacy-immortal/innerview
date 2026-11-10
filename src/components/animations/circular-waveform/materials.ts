import * as THREE from 'three';

/**
 * @file materials.ts — material factories for the circular waveform bars.
 * @module components/animations/circular-waveform/materials
 *
 * Creates the double-sided `MeshBasicMaterial` instances used by the
 * circular waveform equalizer bars and their idle glow. Consumed by
 * `WaveformLayerMesh`.
 */

/**
 * Create a double-sided basic material for the equalizer bars.
 * @param color - Bar color as a CSS hex string.
 * @param opacity - Bar opacity in [0, 1] (default 1).
 * @returns A new mesh basic material for the bars.
 */
export function createBarMaterial(
  color: string,
  opacity = 1
): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
  });
}
