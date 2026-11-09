import { Box } from '@chakra-ui/react';
import { Canvas } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { HypnoticScene } from './hypnotic/HypnoticScene';
import { DEFAULT_SETTINGS } from './hypnotic/types';
import type { HypnoticBackgroundSettings } from './hypnotic/types';
import { MAX_DPR, useElementVisible } from './perf';

export type { HypnoticBackgroundSettings } from './hypnotic/types';
export { DEFAULT_SETTINGS as HYPNOTIC_DEFAULT_SETTINGS } from './hypnotic/types';

interface HypnoticProps {
  settings?: Partial<HypnoticBackgroundSettings>;
}

export const Hypnotic = ({ settings }: HypnoticProps) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const visible = useElementVisible(boxRef);
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
      zIndex={0}
      style={{ touchAction: 'none' }}
    >
      <Canvas
        camera={{ position: [0, 0, 1], fov: 75 }}
        gl={{
          alpha: true,
          antialias: false,
          preserveDrawingBuffer: false,
          powerPreference: 'high-performance',
        }}
        dpr={MAX_DPR}
        frameloop={visible ? 'demand' : 'never'}
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          display: 'block',
          pointerEvents: 'none',
          touchAction: 'none',
          margin: 0,
          padding: 0,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <HypnoticScene settings={mergedSettings} />
      </Canvas>
    </Box>
  );
};
