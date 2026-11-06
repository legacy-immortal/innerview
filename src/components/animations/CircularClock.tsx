import { Box } from '@chakra-ui/react';
import { Canvas, useFrame } from '@react-three/fiber';
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
  size = 200,
  showSeconds = true,
}: CircularClockProps) => {
  return (
    <Box
      position="absolute"
      top="50%"
      left="50%"
      transform="translate(-50%, -50%)"
      width={`${size}px`}
      height={`${size}px`}
      zIndex={5}
      pointerEvents="none"
    >
      <Canvas
        orthographic
        camera={{ position: [0, 0, 5], zoom: 50 }}
        gl={{ antialias: true, alpha: true }}
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

    // Angles: 12 o'clock at top; Three.js +Z is CCW, so negate for clockwise
    const hourAngle = ((hours + minutes / 60) / 12) * Math.PI * 2 - Math.PI / 2;
    const minuteAngle = (minutes / 60) * Math.PI * 2 - Math.PI / 2;
    const secondAngle = (seconds / 60) * Math.PI * 2 - Math.PI / 2;

    meshes.hourHand.rotation.z = -hourAngle;
    meshes.minuteHand.rotation.z = -minuteAngle;
    if (showSeconds) {
      meshes.secondHand.rotation.z = -secondAngle;
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
