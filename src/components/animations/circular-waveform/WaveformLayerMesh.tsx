import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import * as THREE from 'three';
import { createBarMaterial } from './materials';
import type { WaveformLayer, WaveformSettings } from './types';

/**
 * @file Single waveform layer — renders equalizer bars for one layer using
 * instanced rendering (main mesh plus a glow mesh shown while idle).
 */

/** Props for a waveform layer mesh. */
export interface WaveformLayerMeshProps {
  readonly layer: WaveformLayer;
  readonly baseRadius: number;
  readonly pointCount: number;
  readonly pulseAmplitude: number;
  readonly baseWaveformData: readonly number[];
  readonly isIdle: boolean;
  readonly layerIndex: number;
  readonly pulsePhase: number;
  readonly settings: WaveformSettings;
}

/**
 * Render equalizer bars for a single waveform layer.
 * @param props - Layer definition and per-frame state.
 * @returns The instanced bar meshes, or null while uninitialized.
 */
export function WaveformLayerMesh({
  layer,
  baseRadius,
  pointCount,
  pulseAmplitude,
  baseWaveformData,
  isIdle,
  layerIndex,
  pulsePhase,
  settings,
}: WaveformLayerMeshProps): ReactElement | null {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const glowInstancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(
    createBarMaterial(layer.color, 1)
  );
  const glowMaterialRef = useRef<THREE.MeshBasicMaterial>(
    createBarMaterial(layer.color, 0.15)
  );
  const barGeometryRef = useRef<THREE.PlaneGeometry | null>(null);
  const matrixRef = useRef<THREE.Matrix4>(new THREE.Matrix4());
  const scaleVecRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const lastPointCountRef = useRef<number>(0);
  const lastBarWidthRef = useRef<number>(settings.barWidth);
  // Instanced meshes are created imperatively in effects; this state forces
  // the re-render that mounts them via <primitive>. Without it the first
  // render returns null and nothing is attached until an unrelated parent
  // re-render happens to occur.
  const [isReady, setIsReady] = useState(false);

  // Update material colors when layer changes
  useEffect(() => {
    materialRef.current.color.set(layer.color);
    glowMaterialRef.current.color.set(layer.color);
  }, [layer.color]);

  // Create/update bar geometry when barWidth changes
  useEffect(() => {
    if (settings.barWidth !== lastBarWidthRef.current) {
      if (barGeometryRef.current) {
        barGeometryRef.current.dispose();
      }
      barGeometryRef.current = new THREE.PlaneGeometry(settings.barWidth, 1);
      lastBarWidthRef.current = settings.barWidth;

      // Recreate instanced meshes with new geometry if they exist
      if (instancedMeshRef.current && pointCount > 0) {
        const oldMainMesh = instancedMeshRef.current;
        instancedMeshRef.current = new THREE.InstancedMesh(
          barGeometryRef.current,
          materialRef.current,
          pointCount
        );
        if (oldMainMesh.parent) {
          oldMainMesh.parent.remove(oldMainMesh);
        }
        oldMainMesh.geometry.dispose();
        if (Array.isArray(oldMainMesh.material)) {
          oldMainMesh.material.forEach((mat) => mat.dispose());
        } else {
          oldMainMesh.material.dispose();
        }
      }
      if (glowInstancedMeshRef.current && pointCount > 0) {
        const oldGlowMesh = glowInstancedMeshRef.current;
        glowInstancedMeshRef.current = new THREE.InstancedMesh(
          barGeometryRef.current,
          glowMaterialRef.current,
          pointCount
        );
        if (oldGlowMesh.parent) {
          oldGlowMesh.parent.remove(oldGlowMesh);
        }
        oldGlowMesh.geometry.dispose();
        if (Array.isArray(oldGlowMesh.material)) {
          oldGlowMesh.material.forEach((mat) => mat.dispose());
        } else {
          oldGlowMesh.material.dispose();
        }
      }
      setIsReady(true);
    } else if (!barGeometryRef.current) {
      barGeometryRef.current = new THREE.PlaneGeometry(settings.barWidth, 1);
    }
  }, [settings.barWidth, pointCount]);

  // Create/destroy instanced meshes when pointCount changes
  useEffect(() => {
    if (pointCount !== lastPointCountRef.current && pointCount > 0) {
      // Dispose old instanced meshes
      if (instancedMeshRef.current) {
        instancedMeshRef.current.geometry.dispose();
        if (Array.isArray(instancedMeshRef.current.material)) {
          instancedMeshRef.current.material.forEach((mat) => mat.dispose());
        } else {
          instancedMeshRef.current.material.dispose();
        }
      }
      if (glowInstancedMeshRef.current) {
        glowInstancedMeshRef.current.geometry.dispose();
        if (Array.isArray(glowInstancedMeshRef.current.material)) {
          glowInstancedMeshRef.current.material.forEach((mat) => mat.dispose());
        } else {
          glowInstancedMeshRef.current.material.dispose();
        }
      }

      // Create new instanced meshes
      if (barGeometryRef.current) {
        const mainMesh = new THREE.InstancedMesh(
          barGeometryRef.current,
          materialRef.current,
          pointCount
        );
        const glowMesh = new THREE.InstancedMesh(
          barGeometryRef.current,
          glowMaterialRef.current,
          pointCount
        );
        instancedMeshRef.current = mainMesh;
        glowInstancedMeshRef.current = glowMesh;
        lastPointCountRef.current = pointCount;
        setIsReady(true);
      }
    }
  }, [pointCount]);

  // Update bar positions and scales using instanced matrices
  useFrame((state) => {
    if (
      pointCount <= 0 ||
      !instancedMeshRef.current ||
      !glowInstancedMeshRef.current
    )
      return;

    const time = state.clock.elapsedTime;
    const layerRadius = baseRadius + baseRadius * layer.offset * pulseAmplitude;
    const layerAmplitude = layer.amplitude * (isIdle ? pulseAmplitude : 1);
    const angleStep = (Math.PI * 2) / pointCount;

    for (let i = 0; i < pointCount; i++) {
      const angle = i * angleStep;

      let amplitude = 0;
      if (baseWaveformData.length > 0) {
        const index = i % baseWaveformData.length;
        amplitude = baseWaveformData[index] * layerAmplitude;
        amplitude =
          Math.sign(amplitude) *
          Math.pow(Math.abs(amplitude), settings.amplitudePowerAudio);
      } else if (!isIdle) {
        // Synthetic waveform only when not idle (e.g. no audio yet); when idle we show real data only
        const baseWave = Math.sin(
          angle * layer.frequency + layer.phase + time * settings.animationSpeed
        );
        const irregularWave =
          Math.sin(
            angle * layer.frequency * 1.5 +
              layer.phase * 1.2 +
              time * settings.animationSpeedIrregular
          ) * 0.3;
        const highFreq =
          Math.sin(
            angle * layer.frequency * 2.8 +
              layer.phase * 1.8 +
              time * settings.animationSpeedHighFreq
          ) * 0.15;
        const combined = baseWave + irregularWave + highFreq;
        amplitude =
          Math.sign(combined) *
          Math.pow(Math.abs(combined), settings.amplitudePowerSynthetic) *
          layerAmplitude;
      }

      // Calculate bar length (height) - extends outward from base radius
      const barLength = Math.max(
        0.01,
        Math.abs(amplitude) * (layerRadius * settings.barLengthMultiplier)
      );
      // Position at the base radius, bar extends outward from here
      const baseDistance = layerRadius;
      const offsetDistance = amplitude > 0 ? barLength * 0.5 : -barLength * 0.5;
      const x = Math.cos(angle) * (baseDistance + offsetDistance);
      const y = Math.sin(angle) * (baseDistance + offsetDistance);
      const z = 0;

      // Create transformation matrix for this instance
      matrixRef.current.identity();
      matrixRef.current.makeRotationZ(angle + Math.PI / 2);
      scaleVecRef.current.set(1, barLength, 1);
      matrixRef.current.scale(scaleVecRef.current);
      matrixRef.current.setPosition(x, y, z);

      // Update instance matrices
      instancedMeshRef.current.setMatrixAt(i, matrixRef.current);
      glowInstancedMeshRef.current.setMatrixAt(i, matrixRef.current);
    }

    // Mark matrices as needing update
    if (instancedMeshRef.current) {
      instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    }
    if (glowInstancedMeshRef.current) {
      glowInstancedMeshRef.current.instanceMatrix.needsUpdate = true;
      glowInstancedMeshRef.current.visible = isIdle;
    }

    // Update glow opacity
    if (isIdle && glowMaterialRef.current) {
      const glowOpacity =
        settings.glowOpacityBase +
        Math.sin(pulsePhase + layerIndex * 0.5) * settings.glowOpacityRange;
      glowMaterialRef.current.opacity = glowOpacity;
    }
  });

  if (
    !isReady ||
    pointCount <= 0 ||
    !instancedMeshRef.current ||
    !glowInstancedMeshRef.current
  )
    return null;

  return (
    <group>
      <primitive object={instancedMeshRef.current} />
      {isIdle && <primitive object={glowInstancedMeshRef.current} />}
    </group>
  );
}
