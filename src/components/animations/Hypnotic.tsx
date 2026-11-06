import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

export interface HypnoticBackgroundSettings {
  intensity: number;
  primaryColor1: [number, number, number];
  primaryColor2: [number, number, number];
  secondaryColor1: [number, number, number];
  secondaryColor2: [number, number, number];
  tertiaryColor1: [number, number, number];
  tertiaryColor2: [number, number, number];
  breathingEnabled: boolean;
  breathingSpeed: number;
  breathingIntensity: number;
  particlesEnabled: boolean;
  particlesCount: number;
  particlesOpacity: number;
  rotationSpeed1: number;
  rotationSpeed2: number;
  rotationSpeed3: number;
}

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const primaryGradientFragment = `
precision highp float;
uniform float time;
uniform vec2 resolution;
uniform vec3 color1;
uniform vec3 color2;
uniform float intensity;
uniform float breathingSpeed;
uniform float breathingIntensity;
uniform int breathingEnabled;
uniform float rotationSpeed;
varying vec2 vUv;

void main() {
  vec2 uv = (vUv - 0.5) * 2.0;
  uv.x *= resolution.x / resolution.y;

  float breathing = 1.0;
  if (breathingEnabled == 1) {
    breathing = 1.0 + sin(time * breathingSpeed) * breathingIntensity;
  }

  float angle = time * rotationSpeed;
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  vec2 rotatedUv = rot * uv;

  float dist = length(rotatedUv);
  float gradient = 1.0 - smoothstep(0.0, 0.7, dist);
  vec3 color = mix(color2, color1, gradient);
  color = mix(vec3(0.0), color, smoothstep(0.4, 0.0, dist));
  color *= intensity * breathing;

  gl_FragColor = vec4(color, 1.0);
}
`;

const secondaryGradientFragment = `
precision highp float;
uniform float time;
uniform vec2 resolution;
uniform vec3 color1;
uniform vec3 color2;
uniform float intensity;
uniform float breathingSpeed;
uniform float breathingIntensity;
uniform int breathingEnabled;
uniform float rotationSpeed;
varying vec2 vUv;

void main() {
  vec2 uv = (vUv - 0.5) * 2.0;
  uv.x *= resolution.x / resolution.y;

  float breathing = 1.0;
  if (breathingEnabled == 1) {
    breathing = 1.0 + sin(time * breathingSpeed + 1.0) * breathingIntensity;
  }

  float angle = -time * rotationSpeed;
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  vec2 rotatedUv = rot * uv;

  float dist = length(rotatedUv);
  float gradient = 1.0 - smoothstep(0.0, 0.65, dist);
  vec3 color = mix(color2, color1, gradient);
  color = mix(vec3(0.0), color, smoothstep(0.35, 0.0, dist));
  color *= intensity * breathing;

  gl_FragColor = vec4(color, 1.0);
}
`;

const tertiaryGradientFragment = `
precision highp float;
uniform float time;
uniform vec2 resolution;
uniform vec3 color1;
uniform vec3 color2;
uniform float intensity;
uniform float breathingSpeed;
uniform float breathingIntensity;
uniform int breathingEnabled;
uniform float rotationSpeed;
varying vec2 vUv;

void main() {
  vec2 uv = (vUv - 0.5) * 2.0;
  uv.x *= resolution.x / resolution.y;

  float breathing = 1.0;
  if (breathingEnabled == 1) {
    breathing = 1.0 + sin(time * breathingSpeed + 2.0) * breathingIntensity;
  }

  float pulse = sin(time * 0.418879) * 0.5 + 0.5; // pulse over 15 seconds
  float scale = mix(1.0, 1.2, pulse);
  vec2 scaledUv = uv / scale;

  float angle = -time * rotationSpeed;
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  vec2 rotatedUv = rot * scaledUv;

  float dist = length(rotatedUv);
  float gradient = 1.0 - smoothstep(0.0, 0.5, dist);
  vec3 color = mix(color2, color1, gradient);
  color = mix(vec3(0.0), color, smoothstep(0.3, 0.0, dist));
  color *= intensity * breathing;

  gl_FragColor = vec4(color, 1.0);
}
`;

const geometricPatternFragment = `
precision highp float;
uniform float time;
uniform vec2 resolution;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(resolution.x / resolution.y, 1.0);

  float pattern = 0.0;

  // Radial gradients
  vec2 p1 = (uv - vec2(0.25, 0.25)) * aspect;
  pattern += 0.01 * exp(-dot(p1, p1) * 200.0);

  vec2 p2 = (uv - vec2(0.75, 0.75)) * aspect;
  pattern += 0.008 * exp(-dot(p2, p2) * 200.0);

  vec2 p3 = (uv - vec2(0.5, 0.5)) * aspect;
  pattern += 0.005 * exp(-dot(p3, p3) * 400.0);

  // Conic gradient
  vec2 center = vec2(0.5, 0.5);
  vec2 dir = normalize((uv - center) * aspect);
  float angle = atan(dir.y, dir.x) + time * 0.314159; // rotate over 20 seconds
  float conic = sin(angle * 2.0) * 0.5 + 0.5;
  pattern += 0.008 * conic * exp(-length((uv - center) * aspect) * 10.0);

  gl_FragColor = vec4(vec3(pattern), 1.0);
}
`;

const energyWaveFragment = `
precision highp float;
uniform float time;
uniform vec2 resolution;
uniform vec3 color1;
uniform vec3 color2;
varying vec2 vUv;

void main() {
  vec2 uv = (vUv - 0.5) * 2.0;
  uv.x *= resolution.x / resolution.y;

  float pulse = sin(time * 0.785398) * 0.5 + 0.5; // pulse over 8 seconds
  float scale = mix(1.0, 1.5, pulse);
  vec2 scaledUv = uv / scale;

  float dist = length(scaledUv);
  float opacity = mix(0.05, 0.15, pulse); // Reduced opacity to be more subtle
  float gradient = opacity * exp(-dist * 2.5);

  // Use theme colors instead of hardcoded purple
  vec3 color = mix(color2, color1, 0.5) * gradient;

  gl_FragColor = vec4(color, 1.0);
}
`;

const scanLinesFragment = `
precision highp float;
uniform float time;
uniform vec2 resolution;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;

  // Create horizontal scan lines
  float scanLineCount = resolution.y * 0.3;

  // Add subtle scrolling effect
  float scroll = mod(time * 0.05, 1.0);
  float linePosition = mod(uv.y + scroll, 1.0 / scanLineCount);

  // Create subtle line pattern with soft edges
  float lineIntensity = smoothstep(0.0, 0.001, linePosition) *
                        smoothstep(0.005, 0.001, linePosition);

  // Only show the lines themselves, make background transparent
  float alpha = lineIntensity * 0.2;
  vec3 lineColor = vec3(0.05);

  gl_FragColor = vec4(lineColor, alpha);
}
`;

interface GradientLayerProps {
  fragmentShader: string;
  color1: [number, number, number];
  color2: [number, number, number];
  scale?: number;
  zIndex?: number;
  intensity: number;
  breathingEnabled: boolean;
  breathingSpeed: number;
  breathingIntensity: number;
  rotationSpeed: number;
}

function GradientLayer({
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
}: GradientLayerProps) {
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
      material.uniforms.resolution.value.set(size.width, size.height);
      // Colors are updated in useEffect, but we keep this for safety
      material.uniforms.color1.value.set(...color1);
      material.uniforms.color2.value.set(...color2);
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
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

function GeometricPatternLayer() {
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
      material.uniforms.resolution.value.set(size.width, size.height);
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
        vertexShader={vertexShader}
        fragmentShader={geometricPatternFragment}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

interface EnergyWaveLayerProps {
  color1: [number, number, number];
  color2: [number, number, number];
}

function EnergyWaveLayer({ color1, color2 }: EnergyWaveLayerProps) {
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
      material.uniforms.resolution.value.set(size.width, size.height);
      // Colors are updated in useEffect, but we keep this for safety
      material.uniforms.color1.value.set(...color1);
      material.uniforms.color2.value.set(...color2);
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
        vertexShader={vertexShader}
        fragmentShader={energyWaveFragment}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

function ScanLinesLayer() {
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
      material.uniforms.resolution.value.set(size.width, size.height);
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
        vertexShader={vertexShader}
        fragmentShader={scanLinesFragment}
        uniforms={uniforms}
        transparent
        blending={THREE.NormalBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

interface ParticleProps {
  index: number;
  position: [number, number];
  opacity: number;
}

function Particle({ index, position, opacity }: ParticleProps) {
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

interface ParticlesProps {
  enabled: boolean;
  count: number;
  opacity: number;
}

function Particles({ enabled, count, opacity }: ParticlesProps) {
  const particles = useMemo(() => {
    if (!enabled) return [];
    return Array.from({ length: count }, (_, i) => ({
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

interface HypnoticSceneProps {
  settings: HypnoticBackgroundSettings;
}

function HypnoticScene({ settings }: HypnoticSceneProps) {
  return (
    <>
      <GradientLayer
        fragmentShader={primaryGradientFragment}
        color1={settings.primaryColor1}
        color2={settings.primaryColor2}
        scale={2}
        zIndex={0.3}
        intensity={settings.intensity}
        breathingEnabled={settings.breathingEnabled}
        breathingSpeed={settings.breathingSpeed}
        breathingIntensity={settings.breathingIntensity}
        rotationSpeed={settings.rotationSpeed1}
      />
      <GradientLayer
        fragmentShader={secondaryGradientFragment}
        color1={settings.secondaryColor1}
        color2={settings.secondaryColor2}
        scale={1.8}
        zIndex={0.2}
        intensity={settings.intensity}
        breathingEnabled={settings.breathingEnabled}
        breathingSpeed={settings.breathingSpeed}
        breathingIntensity={settings.breathingIntensity}
        rotationSpeed={settings.rotationSpeed2}
      />
      <GradientLayer
        fragmentShader={tertiaryGradientFragment}
        color1={settings.tertiaryColor1}
        color2={settings.tertiaryColor2}
        scale={1.2}
        zIndex={0.1}
        intensity={settings.intensity}
        breathingEnabled={settings.breathingEnabled}
        breathingSpeed={settings.breathingSpeed}
        breathingIntensity={settings.breathingIntensity}
        rotationSpeed={settings.rotationSpeed3}
      />
      <Particles
        enabled={settings.particlesEnabled}
        count={settings.particlesCount}
        opacity={settings.particlesOpacity}
      />
      <GeometricPatternLayer />
      <EnergyWaveLayer
        color1={settings.tertiaryColor1}
        color2={settings.tertiaryColor2}
      />
      <ScanLinesLayer />
    </>
  );
}

const DEFAULT_SETTINGS: HypnoticBackgroundSettings = {
  intensity: 0.3,
  primaryColor1: [139 / 255, 92 / 255, 246 / 255],
  primaryColor2: [59 / 255, 130 / 255, 246 / 255],
  secondaryColor1: [99 / 255, 102 / 255, 241 / 255],
  secondaryColor2: [147 / 255, 51 / 255, 234 / 255],
  tertiaryColor1: [236 / 255, 72 / 255, 153 / 255],
  tertiaryColor2: [168 / 255, 85 / 255, 247 / 255],
  breathingEnabled: true,
  breathingSpeed: 0.25,
  breathingIntensity: 0.2,
  particlesEnabled: false,
  particlesCount: 8,
  particlesOpacity: 0.4,
  rotationSpeed1: 0.1256635,
  rotationSpeed2: 0.08976,
  rotationSpeed3: 0.10472,
};

interface HypnoticProps {
  settings?: Partial<HypnoticBackgroundSettings>;
}

export const Hypnotic = ({ settings }: HypnoticProps) => {
  const mergedSettings = useMemo(() => {
    // If settings is empty or incomplete, merge with defaults
    // Otherwise use settings directly (it's a complete object from the store)
    if (!settings || Object.keys(settings).length === 0) {
      return DEFAULT_SETTINGS;
    }
    // Check if all required properties are present (complete settings object)
    const hasAllProperties =
      'primaryColor1' in settings &&
      'primaryColor2' in settings &&
      'secondaryColor1' in settings &&
      'secondaryColor2' in settings &&
      'tertiaryColor1' in settings &&
      'tertiaryColor2' in settings &&
      'intensity' in settings &&
      'breathingEnabled' in settings &&
      'breathingSpeed' in settings &&
      'breathingIntensity' in settings &&
      'particlesEnabled' in settings &&
      'particlesCount' in settings &&
      'particlesOpacity' in settings &&
      'rotationSpeed1' in settings &&
      'rotationSpeed2' in settings &&
      'rotationSpeed3' in settings;

    // If it's a complete settings object, use it directly
    // Otherwise merge with defaults for any missing properties
    return hasAllProperties
      ? (settings as HypnoticBackgroundSettings)
      : { ...DEFAULT_SETTINGS, ...settings };
  }, [settings]);

  return (
    <Canvas
      camera={{ position: [0, 0, 1], fov: 75 }}
      gl={{
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance',
      }}
      dpr={Math.min(window.devicePixelRatio, 2)}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        margin: 0,
        padding: 0,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
    >
      <HypnoticScene settings={mergedSettings} />
    </Canvas>
  );
};
