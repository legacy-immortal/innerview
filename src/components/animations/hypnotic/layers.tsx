import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { ReactElement } from 'react';
import * as THREE from 'three';
import {
  ENERGY_WAVE_FRAGMENT,
  GEOMETRIC_PATTERN_FRAGMENT,
  SCAN_LINES_FRAGMENT,
  VERTEX_SHADER,
} from './shaders';

/**
 * @file Hypnotic background layers — radial gradient layers, a geometric
 * pattern overlay, an energy wave, and a scanline overlay. Each layer keeps
 * its shader uniform updates in single-purpose effects and frame callbacks.
 */

/** Props for a radial gradient layer. */
interface GradientLayerProps {
  readonly fragmentShader: string;
  readonly color1: readonly [number, number, number];
  readonly color2: readonly [number, number, number];
  readonly scale?: number;
  readonly zIndex?: number;
  readonly intensity: number;
  readonly breathingEnabled: boolean;
  readonly breathingSpeed: number;
  readonly breathingIntensity: number;
  readonly rotationSpeed: number;
}

/**
 * Render a radial gradient shader layer.
 * @param props - Gradient layer configuration and animation settings.
 * @returns The gradient mesh element.
 */
export function GradientLayer({
  fragmentShader,
  color1,
  color2,
  scale = 1,
  zIndex = 0,
  intensity,
  breathingEnabled,
  breathingSpeed,
  breathingIntensity,
  rotationSpeed,
}: GradientLayerProps): ReactElement {
  const mesh = useRef<THREE.Mesh>(null);
  const { viewport, size } = useThree();

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      resolution: { value: new THREE.Vector2(size.width, size.height) },
      color1: { value: new THREE.Vector3(...color1) },
      color2: { value: new THREE.Vector3(...color2) },
      intensity: { value: intensity },
      breathingSpeed: { value: breathingSpeed },
      breathingIntensity: { value: breathingIntensity },
      breathingEnabled: { value: breathingEnabled ? 1 : 0 },
      rotationSpeed: { value: rotationSpeed },
    }),
    [
      color1,
      color2,
      intensity,
      breathingEnabled,
      breathingSpeed,
      breathingIntensity,
      rotationSpeed,
      size.width,
      size.height,
    ]
  );

  // Update uniforms immediately when colors or other props change
  useEffect(() => {
    if (mesh.current) {
      const material = mesh.current.material as THREE.ShaderMaterial;
      material.uniforms.color1.value.set(...color1);
      material.uniforms.color2.value.set(...color2);
      material.uniforms.intensity.value = intensity;
      material.uniforms.breathingSpeed.value = breathingSpeed;
      material.uniforms.breathingIntensity.value = breathingIntensity;
      material.uniforms.breathingEnabled.value = breathingEnabled ? 1 : 0;
      material.uniforms.rotationSpeed.value = rotationSpeed;
      material.needsUpdate = true;
    }
  }, [
    color1,
    color2,
    intensity,
    breathingEnabled,
    breathingSpeed,
    breathingIntensity,
    rotationSpeed,
  ]);

  useFrame(({ clock }) => {
    if (mesh.current) {
      const material = mesh.current.material as THREE.ShaderMaterial;
      material.uniforms.time.value = clock.getElapsedTime();
      // Resolution only changes on resize; colors are set in useEffect.
      const res = material.uniforms.resolution.value as THREE.Vector2;
      if (res.x !== size.width || res.y !== size.height) {
        res.set(size.width, size.height);
      }
    }
  });

  // Create a key based on color values to force material recreation when colors change
  const materialKey = `${color1.join(',')}-${color2.join(',')}`;

  return (
    <mesh
      ref={mesh}
      scale={[viewport.width * scale, viewport.height * scale, 1]}
      position={[0, 0, zIndex]}
    >
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        key={materialKey}
        vertexShader={VERTEX_SHADER}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Render the geometric pattern overlay layer.
 * @returns The geometric pattern mesh element.
 */
export function GeometricPatternLayer(): ReactElement {
  const mesh = useRef<THREE.Mesh>(null);
  const { viewport, size } = useThree();

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      resolution: { value: new THREE.Vector2(size.width, size.height) },
    }),
    [size.width, size.height]
  );

  useFrame(({ clock }) => {
    if (mesh.current) {
      const material = mesh.current.material as THREE.ShaderMaterial;
      material.uniforms.time.value = clock.getElapsedTime();
      const res = material.uniforms.resolution.value as THREE.Vector2;
      if (res.x !== size.width || res.y !== size.height) {
        res.set(size.width, size.height);
      }
    }
  });

  return (
    <mesh
      ref={mesh}
      scale={[viewport.width, viewport.height, 1]}
      position={[0, 0, -0.1]}
    >
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        vertexShader={VERTEX_SHADER}
        fragmentShader={GEOMETRIC_PATTERN_FRAGMENT}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/** Props for the energy wave layer. */
interface EnergyWaveLayerProps {
  readonly color1: readonly [number, number, number];
  readonly color2: readonly [number, number, number];
}

/**
 * Render the pulsing energy-wave layer.
 * @param props - The two endpoint colors.
 * @returns The energy wave mesh element.
 */
export function EnergyWaveLayer({
  color1,
  color2,
}: EnergyWaveLayerProps): ReactElement {
  const mesh = useRef<THREE.Mesh>(null);
  const { viewport, size } = useThree();

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      resolution: { value: new THREE.Vector2(size.width, size.height) },
      color1: { value: new THREE.Vector3(...color1) },
      color2: { value: new THREE.Vector3(...color2) },
    }),
    [size.width, size.height, color1, color2]
  );

  // Update uniforms immediately when colors change
  useEffect(() => {
    if (mesh.current) {
      const material = mesh.current.material as THREE.ShaderMaterial;
      material.uniforms.color1.value.set(...color1);
      material.uniforms.color2.value.set(...color2);
      material.needsUpdate = true;
    }
  }, [color1, color2]);

  useFrame(({ clock }) => {
    if (mesh.current) {
      const material = mesh.current.material as THREE.ShaderMaterial;
      material.uniforms.time.value = clock.getElapsedTime();
      // Resolution only changes on resize; colors are set in useEffect.
      const res = material.uniforms.resolution.value as THREE.Vector2;
      if (res.x !== size.width || res.y !== size.height) {
        res.set(size.width, size.height);
      }
    }
  });

  // Create a key based on color values to force material recreation when colors change
  const materialKey = `${color1.join(',')}-${color2.join(',')}`;

  return (
    <mesh
      ref={mesh}
      scale={[viewport.width * 3, viewport.height * 3, 1]}
      position={[0, 0, -0.2]}
    >
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        key={materialKey}
        vertexShader={VERTEX_SHADER}
        fragmentShader={ENERGY_WAVE_FRAGMENT}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Render the scanline overlay layer.
 * @returns The scanline mesh element.
 */
export function ScanLinesLayer(): ReactElement {
  const mesh = useRef<THREE.Mesh>(null);
  const { viewport, size } = useThree();

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      resolution: { value: new THREE.Vector2(size.width, size.height) },
    }),
    [size.width, size.height]
  );

  useFrame(({ clock }) => {
    if (mesh.current) {
      const material = mesh.current.material as THREE.ShaderMaterial;
      material.uniforms.time.value = clock.getElapsedTime();
      const res = material.uniforms.resolution.value as THREE.Vector2;
      if (res.x !== size.width || res.y !== size.height) {
        res.set(size.width, size.height);
      }
    }
  });

  return (
    <mesh
      ref={mesh}
      scale={[viewport.width, viewport.height, 1]}
      position={[0, 0, 0.5]}
    >
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        vertexShader={VERTEX_SHADER}
        fragmentShader={SCAN_LINES_FRAGMENT}
        uniforms={uniforms}
        transparent
        blending={THREE.NormalBlending}
        depthWrite={false}
      />
    </mesh>
  );
}
