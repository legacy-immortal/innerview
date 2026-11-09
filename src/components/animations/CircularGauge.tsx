import { Box } from '@chakra-ui/react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MAX_DPR } from './perf';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface CircularGaugeProps {
  value: number;
  max: number;
  color?: string;
  size?: number;
}

export const CircularGauge = ({
  value,
  max,
  color = '#00D9FF',
  size = 200,
}: CircularGaugeProps) => {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const newPercent = max > 0 ? Math.min(value / max, 1) : 0;
    setPercent(newPercent);
  }, [value, max]);

  // Keep original intent scale: size=500 -> 75/65/55 vmin, scaled proportionally.
  const scaleFactor = size > 0 ? size / 500 : 0.4;
  const baseVmin = Math.round(75 * scaleFactor);
  const mdVmin = Math.round(65 * scaleFactor);
  const lgVmin = Math.round(55 * scaleFactor);

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
        <GaugeScene percent={percent} color={color} />
      </Canvas>
    </Box>
  );
};

function GaugeScene({ percent, color }: { percent: number; color: string }) {
  const [isReady, setIsReady] = useState(false);
  const trackMeshRef = useRef<THREE.Mesh | null>(null);
  const fillMeshRef = useRef<THREE.Mesh | null>(null);
  const fillGeometryRef = useRef<THREE.BufferGeometry | null>(null);
  // Damped display value so the arc sweeps smoothly between the source's
  // 1-second updates instead of jumping.
  const displayPercentRef = useRef(0);

  // Initialize track and fill on mount
  useEffect(() => {
    // Create track (full circle background)
    const trackGeometry = new THREE.RingGeometry(0.8, 1, 64);
    const trackMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
    });
    trackMeshRef.current = new THREE.Mesh(trackGeometry, trackMaterial);

    // Create fill geometry
    fillGeometryRef.current = new THREE.BufferGeometry();
    const fillMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    fillMeshRef.current = new THREE.Mesh(fillGeometryRef.current, fillMaterial);
    fillMeshRef.current.visible = false;

    setIsReady(true);

    return () => {
      if (trackMeshRef.current) {
        trackMeshRef.current.geometry.dispose();
        (trackMeshRef.current.material as THREE.Material).dispose();
      }
      if (fillMeshRef.current) {
        fillMeshRef.current.geometry.dispose();
        (fillMeshRef.current.material as THREE.Material).dispose();
      }
      if (fillGeometryRef.current) {
        fillGeometryRef.current.dispose();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update colors when color prop changes
  useEffect(() => {
    if (trackMeshRef.current) {
      (trackMeshRef.current.material as THREE.MeshBasicMaterial).color.set(
        color
      );
    }
    if (fillMeshRef.current) {
      (fillMeshRef.current.material as THREE.MeshBasicMaterial).color.set(
        color
      );
    }
  }, [color]);

  // Update fill geometry based on the damped display percent
  useFrame((_state, delta) => {
    if (!fillGeometryRef.current || !fillMeshRef.current) return;

    const display =
      displayPercentRef.current +
      (percent - displayPercentRef.current) * Math.min(1, delta * 4);
    displayPercentRef.current =
      Math.abs(percent - display) < 0.0005 ? percent : display;

    if (displayPercentRef.current <= 0) {
      fillMeshRef.current.visible = false;
      return;
    }

    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + displayPercentRef.current * Math.PI * 2;
    const segments = Math.max(32, Math.ceil(displayPercentRef.current * 64));
    const innerRadius = 0.8;
    const outerRadius = 1;

    const positions: number[] = [];
    const indices: number[] = [];

    // Generate vertices for the arc (inner and outer for each segment)
    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + (endAngle - startAngle) * (i / segments);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      positions.push(cos * innerRadius, sin * innerRadius, 0);
      positions.push(cos * outerRadius, sin * outerRadius, 0);
    }

    // Generate indices for quad triangles
    for (let i = 0; i < segments; i++) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2);
      indices.push(base + 1, base + 3, base + 2);
    }

    fillGeometryRef.current.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );
    fillGeometryRef.current.setIndex(indices);
    fillGeometryRef.current.computeVertexNormals();
    fillMeshRef.current.visible = true;
  });

  if (!isReady) return null;

  return (
    <group>
      {trackMeshRef.current && <primitive object={trackMeshRef.current} />}
      {fillMeshRef.current && <primitive object={fillMeshRef.current} />}
    </group>
  );
}
