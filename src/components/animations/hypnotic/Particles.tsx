import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { ReactElement } from 'react';
import * as THREE from 'three';

/**
 * @file Ambient particle layer for the hypnotic background — a set of
 * slowly bobbing circles with a pulsing opacity.
 */

/** Props for a single particle. */
interface ParticleProps {
  readonly index: number;
  readonly position: readonly [number, number];
  readonly opacity: number;
}

/**
 * Render a single ambient particle.
 * @param props - Particle index (drives timing), base position, and opacity.
 * @returns The particle mesh element.
 */
export function Particle({
  index,
  position,
  opacity,
}: ParticleProps): ReactElement {
  const mesh = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();

  const duration = 3 + index * 0.5;
  const delay = index * 0.8;

  useFrame(({ clock }) => {
    if (mesh.current) {
      const elapsed = clock.getElapsedTime() + delay;
      const cycle = (elapsed % duration) / duration;
      const y = Math.sin(cycle * Math.PI) * -0.02;
      const baseOpacity = opacity * 0.3;
      const pulseOpacity =
        baseOpacity + Math.sin(cycle * Math.PI) * opacity * 0.5;

      mesh.current.position.y = position[1] + y;
      const material = mesh.current.material as THREE.MeshBasicMaterial;
      material.opacity = pulseOpacity;
    }
  });

  return (
    <mesh
      ref={mesh}
      position={[position[0], position[1], 0.1]}
      scale={[viewport.width * 0.004, viewport.height * 0.004, 1]}
    >
      <circleGeometry args={[1, 16]} />
      <meshBasicMaterial color={0xffffff} transparent opacity={opacity * 0.3} />
    </mesh>
  );
}

/** Props for the particle layer. */
interface ParticlesProps {
  readonly enabled: boolean;
  readonly count: number;
  readonly opacity: number;
}

/**
 * Render the ambient particle layer, or null when disabled.
 * @param props - Enabled flag, particle count, and opacity.
 * @returns The particles fragment, or null when disabled.
 */
export function Particles({
  enabled,
  count,
  opacity,
}: ParticlesProps): ReactElement | null {
  const particles = useMemo(() => {
    if (!enabled) return [];
    // Cap particle meshes: each one is a draw call + useFrame callback.
    const cappedCount = Math.min(count, 24);
    return Array.from({ length: cappedCount }, (_, i) => ({
      index: i,
      position: [
        (0.2 + i * 0.1 - 0.5) * 2,
        (0.3 + (i % 3) * 0.2 - 0.5) * 2,
      ] as [number, number],
    }));
  }, [enabled, count]);

  if (!enabled) return null;

  return (
    <>
      {particles.map((p) => (
        <Particle
          key={p.index}
          index={p.index}
          position={p.position}
          opacity={opacity}
        />
      ))}
    </>
  );
}
