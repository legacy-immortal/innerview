import { ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer } from '@react-three/postprocessing';
import { useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import * as THREE from 'three';
import { RetroEffect } from './RetroEffect';
import { WAVE_FRAGMENT_SHADER, WAVE_VERTEX_SHADER } from './shaders';
import type { DitheredWavesProps, WaveUniforms } from './types';
import { useThrottledFrames, RENDER_COUNTER } from '../perf';

/**
 * @file Dithered waves scene — renders the fbm wave surface and applies the
 * retro Bayer dither post-processing pass.
 */

/**
 * Render the dithered waves scene with pointer interaction support.
 * @param props - Wave, dither, and interaction props.
 * @returns The scene fragment (mesh, effect composer, pointer plane).
 */
export function DitheredWaves({
  waveSpeed,
  waveFrequency,
  waveAmplitude,
  waveColor,
  colorNum,
  pixelSize,
  disableAnimation,
  enableMouseInteraction,
  mouseRadius,
}: DitheredWavesProps): ReactElement {
  const mesh = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const mouseRef = useRef(new THREE.Vector2());
  const { viewport, size, gl } = useThree();

  // Demand-mode canvas renders at ~30 fps instead of every vsync.
  useThrottledFrames();
  useFrame(() => {
    RENDER_COUNTER.frames += 1;
  });

  const waveUniformsRef = useRef<WaveUniforms>({
    time: new THREE.Uniform(0),
    resolution: new THREE.Uniform(new THREE.Vector2(0, 0)),
    waveSpeed: new THREE.Uniform(waveSpeed),
    waveFrequency: new THREE.Uniform(waveFrequency),
    waveAmplitude: new THREE.Uniform(waveAmplitude),
    waveColor: new THREE.Uniform(new THREE.Color(...waveColor)),
    mousePos: new THREE.Uniform(new THREE.Vector2(0, 0)),
    enableMouseInteraction: new THREE.Uniform(enableMouseInteraction ? 1 : 0),
    mouseRadius: new THREE.Uniform(mouseRadius),
  });

  useEffect(() => {
    const dpr = gl.getPixelRatio();
    const newWidth = Math.floor(size.width * dpr);
    const newHeight = Math.floor(size.height * dpr);
    const targets = [waveUniformsRef.current];
    const mat = materialRef.current;
    if (mat?.uniforms) {
      targets.push(mat.uniforms as WaveUniforms);
    }
    for (const target of targets) {
      const currentRes = target.resolution.value;
      if (currentRes.x !== newWidth || currentRes.y !== newHeight) {
        currentRes.set(newWidth, newHeight);
      }
    }
  }, [size, gl]);

  const prevColor = useRef([...waveColor]);
  useFrame(({ clock }) => {
    // R3F copies the `uniforms` prop into the material's own uniform objects
    // on commit (applyProps): `Object.assign(targetUniform, uniform)`. So
    // `waveUniformsRef` is NOT the object the shader reads. Writes must go
    // through the live material; mirroring to the ref keeps a later commit
    // (applyProps) from overwriting the material with stale values.
    const targets = [waveUniformsRef.current];
    const mat = materialRef.current;
    if (mat?.uniforms) {
      targets.push(mat.uniforms as WaveUniforms);
    }

    const elapsed = clock.getElapsedTime();
    for (const u of targets) {
      if (!disableAnimation) {
        u.time.value = elapsed;
      }

      if (u.waveSpeed.value !== waveSpeed) u.waveSpeed.value = waveSpeed;
      if (u.waveFrequency.value !== waveFrequency)
        u.waveFrequency.value = waveFrequency;
      if (u.waveAmplitude.value !== waveAmplitude)
        u.waveAmplitude.value = waveAmplitude;

      u.enableMouseInteraction.value = enableMouseInteraction ? 1 : 0;
      u.mouseRadius.value = mouseRadius;

      if (enableMouseInteraction) {
        u.mousePos.value.copy(mouseRef.current);
      }
    }

    if (!prevColor.current.every((v, i) => v === waveColor[i])) {
      for (const u of targets) {
        u.waveColor.value.set(...waveColor);
      }
      prevColor.current = [...waveColor];
    }
  });

  const handlePointerMove = (e: ThreeEvent<PointerEvent>): void => {
    if (!enableMouseInteraction) return;
    const rect = gl.domElement.getBoundingClientRect();
    const dpr = gl.getPixelRatio();
    mouseRef.current.set(
      (e.clientX - rect.left) * dpr,
      (e.clientY - rect.top) * dpr
    );
  };

  return (
    <>
      <mesh ref={mesh} scale={[viewport.width, viewport.height, 1]}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={WAVE_VERTEX_SHADER}
          fragmentShader={WAVE_FRAGMENT_SHADER}
          uniforms={waveUniformsRef.current}
        />
      </mesh>

      <EffectComposer multisampling={0}>
        <RetroEffect colorNum={colorNum} pixelSize={pixelSize} />
      </EffectComposer>

      <mesh
        onPointerMove={handlePointerMove}
        position={[0, 0, 0.01]}
        scale={[viewport.width, viewport.height, 1]}
        visible={false}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </>
  );
}
