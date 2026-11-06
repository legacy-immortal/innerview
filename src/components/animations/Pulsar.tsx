import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

export interface PulsarBackgroundSettings {
  lineSpacing: number;
  lineColor: string;
  bgColor: string;
  rotationX: number;
  rotationY: number;
  scale: number;
  verticalScale: number;
  animationSpeed: number;
}

interface PulsarSceneProps {
  settings: PulsarBackgroundSettings;
}

function PulsarScene({ settings }: PulsarSceneProps) {
  const linesRef = useRef<THREE.Group>(null);
  const [pulsarData, setPulsarData] = useState<number[][]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    fetch(
      'https://raw.githubusercontent.com/maxkueng/PSR-B1919-21/master/pulsar.csv'
    )
      .then((response) => response.text())
      .then((csvText) => {
        const rows = csvText.trim().split('\n');
        const data = rows.map((row) =>
          row.split(',').map((val) => Number.parseFloat(val))
        );
        setPulsarData(data);
        setDataLoaded(true);
      })
      .catch((error) => {
        console.error('Error loading pulsar data:', error);
      });
  }, []);

  const lines = useMemo(() => {
    if (!dataLoaded || pulsarData.length === 0) {
      return [];
    }

    const linesArray: THREE.Line[] = [];

    pulsarData.forEach((rowData, i) => {
      const points: THREE.Vector3[] = [];

      rowData.forEach((value, j) => {
        const x = (j / (rowData.length - 1)) * 10 - 5;
        const y = value * settings.verticalScale;
        const z =
          i * settings.lineSpacing -
          (pulsarData.length * settings.lineSpacing) / 2;

        points.push(new THREE.Vector3(x * settings.scale, y, z));
      });

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(settings.lineColor),
        linewidth: 2,
      });

      const line = new THREE.Line(geometry, material);
      linesArray.push(line);
    });

    return linesArray;
  }, [
    pulsarData,
    dataLoaded,
    settings.lineSpacing,
    settings.lineColor,
    settings.scale,
    settings.verticalScale,
  ]);

  useEffect(() => {
    if (linesRef.current) {
      while (linesRef.current.children.length > 0) {
        const child = linesRef.current.children[0];
        if (child instanceof THREE.Line) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
        linesRef.current.remove(child);
      }

      lines.forEach((line) => {
        linesRef.current?.add(line);
      });
    }
  }, [lines]);

  useEffect(() => {
    if (linesRef.current) {
      linesRef.current.rotation.x = settings.rotationX;
      linesRef.current.rotation.y = settings.rotationY;
    }
  }, [settings.rotationX, settings.rotationY]);

  useFrame((state) => {
    if (linesRef.current) {
      linesRef.current.rotation.y =
        settings.rotationY +
        Math.sin(state.clock.elapsedTime * settings.animationSpeed) * 0.05;
    }
  });

  return (
    <>
      {/* eslint-disable-next-line react/no-unknown-property */}
      <color attach="background" args={[settings.bgColor]} />
      {/* eslint-disable-next-line react/no-unknown-property */}
      <ambientLight intensity={0.5} />
      <group ref={linesRef} />
      {!dataLoaded && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshBasicMaterial color="white" />
        </mesh>
      )}
    </>
  );
}

interface PulsarProps {
  settings: PulsarBackgroundSettings;
}

export default function Pulsar({ settings }: PulsarProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 75 }}
      style={{ width: '100%', height: '100%' }}
    >
      <PulsarScene settings={settings} />
    </Canvas>
  );
}
