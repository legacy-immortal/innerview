import {
  WaveformLayer,
  WaveformSettings,
} from '@/components/background/BackgroundControlPanel';
import { useSystemDataSource } from '@/hooks/useSystemDataSource';
import { useSettingsStore } from '@/lib/settings-store';
import { Box, Text } from '@chakra-ui/react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MutableRefObject, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import {
  DEFAULT_SYSTEM_TEXT,
  systemTextAnimationCss,
} from './systemTextAnimation';

interface CircularWaveformProps {
  isActive: boolean;
  audioElement?: HTMLAudioElement | null;
  analyserNode?: AnalyserNode | null;
  useSpeechSynthesis?: boolean;
  isIdle?: boolean;
  layers?: WaveformLayer[];
  settings?: WaveformSettings;
  systemDataSource?: ReturnType<typeof useSystemDataSource>;
}

const DEFAULT_SETTINGS: WaveformSettings = {
  pointCount: 256,
  breathingEnabled: true,
  breathingSpeed: 0.02,
  breathingIntensity: 0.15,
  radius: 0.25,
  barWidth: 0.02,
  barLengthMultiplier: 0.5,
  animationSpeed: 0.5,
  animationSpeedIrregular: 0.3,
  animationSpeedHighFreq: 0.6,
  amplitudePowerAudio: 0.7,
  amplitudePowerSynthetic: 0.75,
  glowOpacityBase: 0.15,
  glowOpacityRange: 0.08,
};

// Default layers
const DEFAULT_LAYERS: WaveformLayer[] = [
  {
    id: '1',
    color: '#00D9FF',
    offset: 0,
    amplitude: 0.4,
    frequency: 2.5,
    phase: 0,
  },
  {
    id: '2',
    color: '#FF00FF',
    offset: 0.08,
    amplitude: 0.35,
    frequency: 2.2,
    phase: Math.PI / 4,
  },
  {
    id: '3',
    color: '#00D9FF',
    offset: 0.15,
    amplitude: 0.45,
    frequency: 2.8,
    phase: Math.PI / 2,
  },
  {
    id: '4',
    color: '#FF00FF',
    offset: 0.22,
    amplitude: 0.38,
    frequency: 2.1,
    phase: Math.PI * 0.75,
  },
  {
    id: '5',
    color: '#00D9FF',
    offset: 0.28,
    amplitude: 0.42,
    frequency: 3.0,
    phase: Math.PI,
  },
  {
    id: '6',
    color: '#FF00FF',
    offset: 0.35,
    amplitude: 0.36,
    frequency: 2.4,
    phase: Math.PI * 1.25,
  },
  {
    id: '7',
    color: '#00D9FF',
    offset: 0.42,
    amplitude: 0.48,
    frequency: 2.6,
    phase: Math.PI * 1.5,
  },
];

// Helper to create material for equalizer bars
function createBarMaterial(color: string, opacity: number = 1) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
  });
}

// Component for a single waveform layer with equalizer bars using instanced rendering
function WaveformLayerMesh({
  layer,
  baseRadius,
  pointCount,
  pulseAmplitude,
  baseWaveformData,
  isIdle,
  layerIndex,
  pulsePhase,
  settings,
}: {
  layer: WaveformLayer;
  baseRadius: number;
  pointCount: number;
  pulseAmplitude: number;
  baseWaveformData: number[];
  isIdle: boolean;
  layerIndex: number;
  pulsePhase: number;
  settings: WaveformSettings;
}) {
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

// Camera adjustment component to maintain perfect circle
function CameraAdjuster() {
  const { camera, size } = useThree();

  useFrame(() => {
    if (camera instanceof THREE.OrthographicCamera) {
      const aspect = size.width / size.height;
      const baseViewSize = 28; // Base view size

      // Match camera viewport to canvas aspect ratio so circle appears as perfect circle
      camera.left = -baseViewSize * aspect;
      camera.right = baseViewSize * aspect;
      camera.top = baseViewSize;
      camera.bottom = -baseViewSize;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

// Main scene component
function WaveformScene({
  layers,
  settingsRef,
  isIdle,
  pulsePhase,
  baseWaveformData,
}: {
  layers: WaveformLayer[];
  settingsRef: MutableRefObject<WaveformSettings>;
  isIdle: boolean;
  pulsePhase: number;
  baseWaveformData: number[];
}) {
  const groupRef = useRef<THREE.Group>(null);

  return (
    <>
      <CameraAdjuster />
      <group ref={groupRef}>
        {layers.map((layer, index) => {
          // Read settings from ref for real-time updates
          const currentSettings = settingsRef.current;
          const baseRadius = currentSettings.radius * 2;
          const pulseAmplitude =
            isIdle && currentSettings.breathingEnabled
              ? Math.sin(pulsePhase) * currentSettings.breathingIntensity +
                (1 - currentSettings.breathingIntensity)
              : 1;
          const radius = baseRadius * pulseAmplitude;

          return (
            <WaveformLayerMesh
              key={layer.id}
              layer={layer}
              baseRadius={radius}
              pointCount={currentSettings.pointCount}
              pulseAmplitude={pulseAmplitude}
              baseWaveformData={baseWaveformData}
              isIdle={isIdle}
              layerIndex={index}
              pulsePhase={pulsePhase}
              settings={currentSettings}
            />
          );
        })}
      </group>
    </>
  );
}

export const CircularWaveform = ({
  isActive,
  audioElement,
  analyserNode: externalAnalyserNode,
  useSpeechSynthesis = false,
  isIdle = false,
  layers: customLayers,
  settings = DEFAULT_SETTINGS,
  systemDataSource: externalSystemDataSource,
}: CircularWaveformProps) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pulsePhase, setPulsePhase] = useState(0);
  const [baseWaveformData, setBaseWaveformData] = useState<number[]>([]);
  const settingsRef = useRef<WaveformSettings>(settings);

  // Use external systemDataSource if provided, otherwise create internal one
  const internalSystemDataSource = useSystemDataSource(isIdle, 4000);
  const systemDataSource = externalSystemDataSource || internalSystemDataSource;

  const systemTextOpts = useSettingsStore(
    useShallow(
      (state) => state.settings?.background?.systemText ?? DEFAULT_SYSTEM_TEXT
    )
  );
  const systemTextCss = useMemo(
    () => systemTextAnimationCss(systemTextOpts, 'systemTextFadeWaveform'),
    [systemTextOpts]
  );

  // Merge user settings with source-specific settings when idle (preserve colors in layers)
  const effectiveSettings = useMemo(
    () =>
      isIdle && systemDataSource.currentSource.waveformSettings
        ? {
            ...settings,
            ...systemDataSource.currentSource.waveformSettings,
          }
        : settings,
    [isIdle, settings, systemDataSource.currentSource.waveformSettings]
  );

  // Update settings ref when settings change (for real-time updates)
  useEffect(() => {
    settingsRef.current = effectiveSettings;
  }, [effectiveSettings]);

  // Get layers
  const layers =
    customLayers && customLayers.length > 0 ? customLayers : DEFAULT_LAYERS;

  // Pulse animation for idle state
  useEffect(() => {
    if (!isIdle || !effectiveSettings.breathingEnabled) {
      setPulsePhase(0);
      return;
    }

    const interval = setInterval(() => {
      setPulsePhase(
        (prev) => (prev + effectiveSettings.breathingSpeed) % (Math.PI * 2)
      );
    }, 16);

    return () => clearInterval(interval);
  }, [
    isIdle,
    effectiveSettings.breathingEnabled,
    effectiveSettings.breathingSpeed,
  ]);

  // Store the latest getData function in a ref to avoid stale closures
  const getDataRef = useRef(systemDataSource.getData);
  const systemDataSourceRef = useRef(systemDataSource);

  // Update refs when systemDataSource changes (but don't trigger re-render)
  // Using empty deps to avoid running on every render - refs update on systemDataSource change via the outer closure
  useEffect(() => {
    systemDataSourceRef.current = systemDataSource;
    getDataRef.current = systemDataSource.getData;
  }, [systemDataSource]);

  // Update waveform data from system sources when idle (separate from audio)
  useEffect(() => {
    if (!isIdle || isPlaying || !isActive) {
      return;
    }

    let frameId: number;
    const updateSystemData = () => {
      // Use ref to get latest values without causing re-renders
      const currentGetData = getDataRef.current;
      if (isIdle && !isPlaying && isActive && currentGetData) {
        const systemData = currentGetData(settings.pointCount);
        if (systemData.length > 0) {
          setBaseWaveformData(systemData);
        }
        frameId = requestAnimationFrame(updateSystemData);
      }
    };

    frameId = requestAnimationFrame(updateSystemData);
    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [isIdle, isPlaying, isActive, settings.pointCount]);

  // Audio setup
  useEffect(() => {
    // If external analyser node provided (streaming), use it directly
    if (externalAnalyserNode) {
      analyserRef.current = externalAnalyserNode;
      const bufferLength = externalAnalyserNode.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      setIsPlaying(isActive);
      return;
    }

    // Otherwise, use audio element (file playback or fallback)
    if (!isActive || !audioElement) {
      setIsPlaying(false);
      setBaseWaveformData([]);
      return;
    }

    const setupAudioVisualization = async () => {
      try {
        if (!audioContextRef.current) {
          // Support both standard AudioContext and webkit-prefixed version
          const AudioContextClass =
            window.AudioContext ||
            (
              window as typeof window & {
                webkitAudioContext?: typeof AudioContext;
              }
            ).webkitAudioContext;
          if (!AudioContextClass) {
            throw new Error('AudioContext is not supported in this browser');
          }
          audioContextRef.current = new AudioContextClass();
        }

        const audioContext = audioContextRef.current;

        if (!analyserRef.current) {
          analyserRef.current = audioContext.createAnalyser();
          analyserRef.current.fftSize = 2048;
          analyserRef.current.smoothingTimeConstant = 0.3;
        }

        const analyser = analyserRef.current;
        const bufferLength = analyser.frequencyBinCount;
        dataArrayRef.current = new Uint8Array(bufferLength);

        if (!sourceRef.current) {
          sourceRef.current =
            audioContext.createMediaElementSource(audioElement);
          sourceRef.current.connect(analyser);
          analyser.connect(audioContext.destination);
        }

        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleEnded = () => setIsPlaying(false);

        audioElement.addEventListener('play', handlePlay);
        audioElement.addEventListener('pause', handlePause);
        audioElement.addEventListener('ended', handleEnded);

        setIsPlaying(!audioElement.paused && !audioElement.ended);

        // Update waveform data
        const updateWaveform = () => {
          if (
            analyser &&
            dataArrayRef.current &&
            !useSpeechSynthesis &&
            effectiveSettings.pointCount > 0
          ) {
            analyser.getByteTimeDomainData(dataArrayRef.current);
            const data: number[] = [];
            for (let i = 0; i < effectiveSettings.pointCount; i++) {
              const index = Math.floor(
                (i / effectiveSettings.pointCount) * dataArrayRef.current.length
              );
              const value = (dataArrayRef.current[index] - 128) / 128;
              data.push(value);
            }
            setBaseWaveformData(data);
          }
          if (isPlaying) {
            requestAnimationFrame(updateWaveform);
          }
        };

        if (isPlaying) {
          updateWaveform();
        }

        return () => {
          audioElement.removeEventListener('play', handlePlay);
          audioElement.removeEventListener('pause', handlePause);
          audioElement.removeEventListener('ended', handleEnded);
        };
      } catch (error) {
        console.error('Error setting up audio visualization:', error);
        return () => {};
      }
    };

    let cleanup: (() => void) | undefined;
    setupAudioVisualization().then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    return () => {
      setIsPlaying(false);
      if (!isIdle) {
        setBaseWaveformData([]);
      }
      if (cleanup) cleanup();
    };
  }, [
    isActive,
    audioElement,
    externalAnalyserNode,
    isPlaying,
    useSpeechSynthesis,
    effectiveSettings.pointCount,
    isIdle,
  ]);

  if (!isActive && !isIdle) return null;

  return (
    <Box
      position="absolute"
      top="0"
      left="0"
      right="0"
      bottom="0"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={5}
      pointerEvents="none"
      width="100vw"
      height="100vh"
      opacity={isIdle ? 0.5 : 0.9}
      transition="opacity 0.3s ease-in-out"
    >
      {/* System data source label - centered in waveform */}
      {systemDataSource.showSourceLabel && isIdle && (
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          zIndex={10}
          fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
          fontSize="md"
          letterSpacing="0.1em"
          css={systemTextCss}
        >
          <Text
            as="span"
            color="cyan.400"
            fontWeight={600}
            fontSize="md"
            css={{
              textShadow: '0 0 4px rgba(255, 255, 255, 0.08)',
            }}
          >
            [SYSTEM]:
          </Text>
          <Text
            as="span"
            ml={3}
            color="gray.300"
            fontSize="md"
            css={{
              textShadow: '0 0 4px rgba(255, 255, 255, 0.08)',
            }}
          >
            {systemDataSource.currentSource.description}
          </Text>
        </Box>
      )}
      <Canvas
        orthographic
        camera={{ position: [0, 0, 5], zoom: 35 }}
        gl={{
          antialias: true,
          alpha: true,
        }}
        style={{
          width: '100%',
          height: '100%',
        }}
        onCreated={({ gl, camera, size }) => {
          gl.setClearColor(0x000000, 0);
          // Initialize orthographic camera to match canvas aspect ratio for perfect circle
          if (camera instanceof THREE.OrthographicCamera) {
            const baseViewSize = 28;
            const aspect = size.width / size.height;
            // Match camera viewport to canvas aspect ratio so circle appears as perfect circle
            camera.left = -baseViewSize * aspect;
            camera.right = baseViewSize * aspect;
            camera.top = baseViewSize;
            camera.bottom = -baseViewSize;
            camera.updateProjectionMatrix();
          }
        }}
      >
        <WaveformScene
          layers={layers}
          settingsRef={settingsRef}
          isIdle={isIdle}
          pulsePhase={pulsePhase}
          baseWaveformData={baseWaveformData}
        />
      </Canvas>
    </Box>
  );
};
