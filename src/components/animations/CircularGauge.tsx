import { Box } from '@chakra-ui/react';
import { Canvas, useFrame } from '@react-three/fiber';
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

  // Update fill geometry based on percent
  useFrame(() => {
    if (!fillGeometryRef.current || !fillMeshRef.current) return;

    if (percent <= 0) {
      fillMeshRef.current.visible = false;
      return;
    }

    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + percent * Math.PI * 2;
    const segments = Math.max(32, Math.ceil(percent * 64));
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
