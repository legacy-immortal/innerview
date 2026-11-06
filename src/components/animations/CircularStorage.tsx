import { Box } from '@chakra-ui/react';
import { Canvas } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface CircularStorageProps {
  used: number;
  total: number;
  color?: string;
  size?: number;
}

export const CircularStorage = ({
  used,
  total,
  color = '#00D9FF',
  size = 200,
}: CircularStorageProps) => {
  const percent = total > 0 ? Math.min(used / total, 1) : 0;

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
        <PieChartScene percent={percent} color={color} />
      </Canvas>
    </Box>
  );
};

function PieChartScene({ percent, color }: { percent: number; color: string }) {
  const [isReady, setIsReady] = useState(false);
  const usedMeshRef = useRef<THREE.Mesh | null>(null);
  const unusedMeshRef = useRef<THREE.Mesh | null>(null);
  const usedMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const unusedMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);

  // Create initial meshes
  useEffect(() => {
    usedMaterialRef.current = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });

    unusedMaterialRef.current = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });

    // Create initial geometries
    const radius = 1;
    const startAngle = -Math.PI / 2;
    const usedAngle = startAngle + percent * Math.PI * 2;
    const unusedAngle = usedAngle + (1 - percent) * Math.PI * 2;

    const usedShape = new THREE.Shape();
    usedShape.moveTo(0, 0);
    usedShape.lineTo(
      Math.cos(startAngle) * radius,
      Math.sin(startAngle) * radius
    );
    usedShape.absarc(0, 0, radius, startAngle, usedAngle, false);
    usedShape.lineTo(0, 0);

    const unusedShape = new THREE.Shape();
    unusedShape.moveTo(0, 0);
    unusedShape.lineTo(
      Math.cos(usedAngle) * radius,
      Math.sin(usedAngle) * radius
    );
    unusedShape.absarc(0, 0, radius, usedAngle, unusedAngle, false);
    unusedShape.lineTo(0, 0);

    usedMeshRef.current = new THREE.Mesh(
      new THREE.ShapeGeometry(usedShape),
      usedMaterialRef.current
    );
    unusedMeshRef.current = new THREE.Mesh(
      new THREE.ShapeGeometry(unusedShape),
      unusedMaterialRef.current
    );

    setIsReady(true);

    return () => {
      if (usedMeshRef.current) {
        usedMeshRef.current.geometry.dispose();
      }
      if (unusedMeshRef.current) {
        unusedMeshRef.current.geometry.dispose();
      }
      if (usedMaterialRef.current) {
        usedMaterialRef.current.dispose();
      }
      if (unusedMaterialRef.current) {
        unusedMaterialRef.current.dispose();
      }
    };
  }, []);

  // Update geometries when percent or color changes
  useEffect(() => {
    if (!usedMeshRef.current || !unusedMeshRef.current) return;

    const radius = 1;
    const startAngle = -Math.PI / 2;
    const usedAngle = startAngle + percent * Math.PI * 2;
    const unusedAngle = usedAngle + (1 - percent) * Math.PI * 2;

    // Dispose old geometries
    usedMeshRef.current.geometry.dispose();
    unusedMeshRef.current.geometry.dispose();

    // Create new geometries
    const usedShape = new THREE.Shape();
    usedShape.moveTo(0, 0);
    usedShape.lineTo(
      Math.cos(startAngle) * radius,
      Math.sin(startAngle) * radius
    );
    usedShape.absarc(0, 0, radius, startAngle, usedAngle, false);
    usedShape.lineTo(0, 0);

    const unusedShape = new THREE.Shape();
    unusedShape.moveTo(0, 0);
    unusedShape.lineTo(
      Math.cos(usedAngle) * radius,
      Math.sin(usedAngle) * radius
    );
    unusedShape.absarc(0, 0, radius, usedAngle, unusedAngle, false);
    unusedShape.lineTo(0, 0);

    usedMeshRef.current.geometry = new THREE.ShapeGeometry(usedShape);
    unusedMeshRef.current.geometry = new THREE.ShapeGeometry(unusedShape);

    // Update colors
    if (usedMaterialRef.current) {
      usedMaterialRef.current.color.set(color);
    }
    if (unusedMaterialRef.current) {
      unusedMaterialRef.current.color.set(color);
    }

    // Update visibility
    usedMeshRef.current.visible = percent > 0;
    unusedMeshRef.current.visible = percent < 1;
  }, [percent, color]);

  if (!isReady) return null;

  return (
    <group>
      {usedMeshRef.current && <primitive object={usedMeshRef.current} />}
      {unusedMeshRef.current && <primitive object={unusedMeshRef.current} />}
    </group>
  );
}
