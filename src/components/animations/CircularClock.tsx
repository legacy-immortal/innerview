import { Box } from '@chakra-ui/react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MAX_DPR } from './perf';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface CircularClockProps {
  hours: number;
  minutes: number;
  seconds: number;
  color?: string;
  size?: number;
  /** When false, second hand is hidden. */
  showSeconds?: boolean;
}

export const CircularClock = ({
  hours,
  minutes,
  seconds,
  color = '#00D9FF',
  size = 2000,
  showSeconds = true,
}: CircularClockProps) => {
  // Keep original intent scale: 80/70/60 vmin at the caller's 2000 baseline,
  // scaled proportionally (clamped) so small defaults don't collapse the clock.
  const scaleFactor = Math.min(
    1.2,
    Math.max(0.5, (size > 0 ? size : 2000) / 2000)
  );
  const baseVmin = Math.round(80 * scaleFactor);
  const mdVmin = Math.round(70 * scaleFactor);
  const lgVmin = Math.round(60 * scaleFactor);

  return (
    <Box
      position="relative"
      display="flex"
      alignItems="center"
      justifyContent="center"
      width={{
        base: `${baseVmin}vmin`,
        md: `${mdVmin}vmin`,
        lg: `${lgVmin}vmin`,
      }}
      height={{
        base: `${baseVmin}vmin`,
        md: `${mdVmin}vmin`,
        lg: `${lgVmin}vmin`,
      }}
      flexShrink={0}
      zIndex={5}
      pointerEvents="none"
      touchAction="none"
    >
      <Canvas
        orthographic
        dpr={MAX_DPR}
        camera={{ position: [0, 0, 5], zoom: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <ClockScene
          hours={hours}
          minutes={minutes}
          seconds={seconds}
          color={color}
          showSeconds={showSeconds}
        />
      </Canvas>
    </Box>
  );
};

function ClockScene({
  hours,
  minutes,
  seconds,
  color,
  showSeconds,
}: {
  hours: number;
  minutes: number;
  seconds: number;
  color: string;
  showSeconds: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [isReady, setIsReady] = useState(false);

  // Store meshes in state to trigger re-render when ready
  const meshesRef = useRef<{
    hourHand: THREE.Mesh | null;
    minuteHand: THREE.Mesh | null;
    secondHand: THREE.Mesh | null;
    centerDot: THREE.Mesh | null;
    faceRing: THREE.Mesh | null;
    markers: THREE.Mesh[];
  }>({
    hourHand: null,
    minuteHand: null,
    secondHand: null,
    centerDot: null,
    faceRing: null,
    markers: [],
  });

  // Create geometries once. BoxGeometry is centered; translate so hand extends from origin (pivot at center).
  const geometriesRef = useRef({
    hourHand: (() => {
      const g = new THREE.BoxGeometry(0.025, 0.25, 0.01);
      g.translate(0, 0.125, 0);
      return g;
    })(),
    minuteHand: (() => {
      const g = new THREE.BoxGeometry(0.02, 0.35, 0.01);
      g.translate(0, 0.175, 0);
      return g;
    })(),
    secondHand: (() => {
      const g = new THREE.BoxGeometry(0.015, 0.4, 0.01);
      g.translate(0, 0.2, 0);
      return g;
    })(),
    centerDot: new THREE.CircleGeometry(0.02, 16),
    marker: new THREE.BoxGeometry(0.01, 0.08, 0.01),
    faceRing: new THREE.RingGeometry(0.92, 1, 64),
  });

  // Create materials
  const materialsRef = useRef<{
    faceRing: THREE.MeshBasicMaterial;
    hourHand: THREE.MeshBasicMaterial;
    minuteHand: THREE.MeshBasicMaterial;
    secondHand: THREE.MeshBasicMaterial;
    centerDot: THREE.MeshBasicMaterial;
    marker: THREE.MeshBasicMaterial;
  } | null>(null);

  // Initialize meshes (color will be set by separate effect)
  useEffect(() => {
    const initialColor = new THREE.Color(color);

    // Create materials
    materialsRef.current = {
      faceRing: new THREE.MeshBasicMaterial({
        color: initialColor.clone(),
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
      }),
      hourHand: new THREE.MeshBasicMaterial({
        color: initialColor.clone(),
        transparent: true,
        opacity: 0.9,
      }),
      minuteHand: new THREE.MeshBasicMaterial({
        color: initialColor.clone(),
        transparent: true,
        opacity: 0.85,
      }),
      secondHand: new THREE.MeshBasicMaterial({
        color: initialColor.clone(),
        transparent: true,
        opacity: 0.95,
      }),
      centerDot: new THREE.MeshBasicMaterial({
        color: initialColor.clone(),
        transparent: true,
        opacity: 0.8,
      }),
      marker: new THREE.MeshBasicMaterial({
        color: initialColor.clone(),
        transparent: true,
        opacity: 0.6,
      }),
    };

    // Create hour hand (pivot at origin)
    const hourHandMesh = new THREE.Mesh(
      geometriesRef.current.hourHand,
      materialsRef.current.hourHand
    );
    hourHandMesh.position.set(0, 0, 0.01);
    meshesRef.current.hourHand = hourHandMesh;

    // Create minute hand (pivot at origin)
    const minuteHandMesh = new THREE.Mesh(
      geometriesRef.current.minuteHand,
      materialsRef.current.minuteHand
    );
    minuteHandMesh.position.set(0, 0, 0.01);
    meshesRef.current.minuteHand = minuteHandMesh;

    // Create second hand (pivot at origin)
    const secondHandMesh = new THREE.Mesh(
      geometriesRef.current.secondHand,
      materialsRef.current.secondHand
    );
    secondHandMesh.position.set(0, 0, 0.02);
    meshesRef.current.secondHand = secondHandMesh;

    // Create center dot
    const centerDotMesh = new THREE.Mesh(
      geometriesRef.current.centerDot,
      materialsRef.current.centerDot
    );
    centerDotMesh.position.set(0, 0, 0.03);
    meshesRef.current.centerDot = centerDotMesh;

    // Create face ring
    const faceRingMesh = new THREE.Mesh(
      geometriesRef.current.faceRing,
      materialsRef.current.faceRing
    );
    meshesRef.current.faceRing = faceRingMesh;

    // Create hour markers
    meshesRef.current.markers = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const markerMesh = new THREE.Mesh(
        geometriesRef.current.marker,
        materialsRef.current.marker
      );
      markerMesh.position.set(
        Math.cos(angle) * 0.88,
        Math.sin(angle) * 0.88,
        0
      );
      markerMesh.rotation.z = angle + Math.PI / 2;
      meshesRef.current.markers.push(markerMesh);
    }

    // Signal that meshes are ready
    setIsReady(true);

    const geometries = geometriesRef.current;
    const materials = materialsRef.current;

    return () => {
      // Cleanup geometries
      Object.values(geometries).forEach((geo) => geo.dispose());

      // Cleanup materials
      if (materials) {
        Object.values(materials).forEach((mat) => mat.dispose());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update colors when color prop changes
  useEffect(() => {
    if (!materialsRef.current) return;
    const baseColor = new THREE.Color(color);
    materialsRef.current.faceRing.color.set(baseColor);
    materialsRef.current.hourHand.color.set(baseColor);
    materialsRef.current.minuteHand.color.set(baseColor);
    materialsRef.current.secondHand.color.set(baseColor);
    materialsRef.current.centerDot.color.set(baseColor);
    materialsRef.current.marker.color.set(baseColor);
  }, [color]);

  // Update hand rotations
  useFrame(() => {
    const meshes = meshesRef.current;
    if (!meshes.hourHand || !meshes.minuteHand || !meshes.secondHand) {
      return;
    }

    // Hands are BoxGeometries translated so they extend along +Y (12
    // o'clock at rotation 0). Three.js rotation.z is counter-clockwise, so
    // a clockwise clock face needs negative rotations proportional to the
    // elapsed fraction. (The previous code subtracted PI/2 before negating,
    // which shifted every hand 90 degrees CCW from the true time.)
    const hourAngle = -(((hours % 12) + minutes / 60) / 12) * Math.PI * 2;
    const minuteAngle = -(minutes / 60) * Math.PI * 2;
    const secondAngle = -((seconds % 60) / 60) * Math.PI * 2;

    meshes.hourHand.rotation.z = hourAngle;
    meshes.minuteHand.rotation.z = minuteAngle;
    if (showSeconds) {
      meshes.secondHand.rotation.z = secondAngle;
      meshes.secondHand.visible = true;
    } else {
      meshes.secondHand.visible = false;
    }
  });

  if (!isReady) {
    return null;
  }

  const meshes = meshesRef.current;

  return (
    <group ref={groupRef}>
      {/* Face ring */}
      {meshes.faceRing && <primitive object={meshes.faceRing} />}

      {/* Hour markers */}
      {meshes.markers.map((marker, i) => (
        <primitive key={i} object={marker} />
      ))}

      {/* Hour hand */}
      {meshes.hourHand && <primitive object={meshes.hourHand} />}

      {/* Minute hand */}
      {meshes.minuteHand && <primitive object={meshes.minuteHand} />}

      {/* Second hand (hidden when showSeconds is false via visibility in useFrame) */}
      {meshes.secondHand && <primitive object={meshes.secondHand} />}

      {/* Center dot */}
      {meshes.centerDot && <primitive object={meshes.centerDot} />}
    </group>
  );
}
