import { Box } from '@chakra-ui/react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MAX_DPR } from './perf';
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

  // Keep original intent scale: size=400 -> 65/55/45 vmin, scaled proportionally.
  const scaleFactor = size > 0 ? size / 400 : 0.5;
  const baseVmin = Math.round(65 * scaleFactor);
  const mdVmin = Math.round(55 * scaleFactor);
  const lgVmin = Math.round(45 * scaleFactor);

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
  // Damped display value so the pie sweeps between the source's 2-second
  // updates instead of jumping (previously there was no animation loop at
  // all — geometry only swapped instantaneously in an effect).
  const displayPercentRef = useRef(0);
  const lastGeometryPercentRef = useRef(-1);

  // Build/rebuild pie geometries for the given percent.
  const updateGeometry = (p: number) => {
    const usedMesh = usedMeshRef.current;
    const unusedMesh = unusedMeshRef.current;
    if (!usedMesh || !unusedMesh) return;

    const radius = 1;
    const startAngle = -Math.PI / 2;
    const usedAngle = startAngle + p * Math.PI * 2;
    const unusedAngle = usedAngle + (1 - p) * Math.PI * 2;

    usedMesh.geometry.dispose();
    unusedMesh.geometry.dispose();

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

    usedMesh.geometry = new THREE.ShapeGeometry(usedShape);
    unusedMesh.geometry = new THREE.ShapeGeometry(unusedShape);
    lastGeometryPercentRef.current = p;

    usedMesh.visible = p > 0;
    unusedMesh.visible = p < 1;
  };

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

    usedMeshRef.current = new THREE.Mesh(
      new THREE.BufferGeometry(),
      usedMaterialRef.current
    );
    unusedMeshRef.current = new THREE.Mesh(
      new THREE.BufferGeometry(),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update colors when color changes
  useEffect(() => {
    if (usedMaterialRef.current) {
      usedMaterialRef.current.color.set(color);
    }
    if (unusedMaterialRef.current) {
      unusedMaterialRef.current.color.set(color);
    }
  }, [color]);

  // Animate the pie toward the target percent each frame.
  useFrame((_state, delta) => {
    if (!usedMeshRef.current || !unusedMeshRef.current) return;

    const display =
      displayPercentRef.current +
      (percent - displayPercentRef.current) * Math.min(1, delta * 3);
    displayPercentRef.current =
      Math.abs(percent - display) < 0.0005 ? percent : display;

    if (
      Math.abs(displayPercentRef.current - lastGeometryPercentRef.current) >
      0.0001
    ) {
      updateGeometry(displayPercentRef.current);
    }
  });

  if (!isReady) return null;

  return (
    <group>
      {usedMeshRef.current && <primitive object={usedMeshRef.current} />}
      {unusedMeshRef.current && <primitive object={unusedMeshRef.current} />}
    </group>
  );
}
