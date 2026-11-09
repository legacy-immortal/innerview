import { Box } from '@chakra-ui/react';
import { Canvas } from '@react-three/fiber';
import { useRef } from 'react';
import { DitheredWaves } from './dither/DitheredWaves';
import type { DitherProps } from './dither/types';
import { useElementVisible } from './perf';

export type { DitherProps } from './dither/types';

export default function Dither({
  waveSpeed = 0.05,
  waveFrequency = 3,
  waveAmplitude = 0.3,
  waveColor = [0.5, 0.5, 0.5],
  colorNum = 4,
  pixelSize = 2,
  disableAnimation = false,
  enableMouseInteraction = true,
  mouseRadius = 1,
}: DitherProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const visible = useElementVisible(boxRef);
  return (
    <Box
      ref={boxRef}
      as="div"
      position="absolute"
      top={0}
      left={0}
      width="100vw"
      height="100dvh"
      maxWidth="100%"
      maxHeight="100%"
      minWidth={0}
      minHeight={0}
      overflow="hidden"
      display="flex"
      alignItems="center"
      justifyContent="center"
      boxSizing="border-box"
      style={{ touchAction: 'none' }}
    >
      <Canvas
        className="dither-container"
        camera={{ position: [0, 0, 6] }}
        dpr={1}
        frameloop={visible ? 'demand' : 'never'}
        gl={{ antialias: false, preserveDrawingBuffer: false }}
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          display: 'block',
          touchAction: 'none',
        }}
      >
        <DitheredWaves
          waveSpeed={waveSpeed}
          waveFrequency={waveFrequency}
          waveAmplitude={waveAmplitude}
          waveColor={waveColor}
          colorNum={colorNum}
          pixelSize={pixelSize}
          disableAnimation={disableAnimation}
          enableMouseInteraction={enableMouseInteraction}
          mouseRadius={mouseRadius}
        />
      </Canvas>
    </Box>
  );
}
