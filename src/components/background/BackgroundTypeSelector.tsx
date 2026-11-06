import type { BackgroundSettings, BackgroundType } from '@/lib/settings-types';
import {
  Box,
  Field,
  HStack,
  NativeSelect,
  Slider,
  Text,
} from '@chakra-ui/react';

interface BackgroundTypeSelectorProps {
  settings: BackgroundSettings;
  onSettingsChange: (settings: BackgroundSettings) => void;
  currentBackgroundType: BackgroundType;
  onBackgroundTypeChange: (type: BackgroundType) => void;
}

export function BackgroundTypeSelector({
  settings,
  onSettingsChange,
  currentBackgroundType,
  onBackgroundTypeChange,
}: BackgroundTypeSelectorProps) {
  return (
    <>
      <Box
        px={3}
        py={2}
        borderBottom="1px solid"
        borderColor="rgba(255, 255, 255, 0.1)"
      >
        <Field.Root>
          <Field.Label fontSize="xs" color="gray.300" mb={2}>
            Background Type
          </Field.Label>
          <NativeSelect.Root>
            <NativeSelect.Field
              value={currentBackgroundType}
              onChange={(e) => {
                onBackgroundTypeChange(e.currentTarget.value as BackgroundType);
              }}
              bg="rgba(255, 255, 255, 0.05)"
              borderColor="rgba(255, 255, 255, 0.1)"
              color="white"
              fontSize="xs"
              _focus={{
                borderColor: 'rgba(255, 255, 255, 0.3)',
              }}
            >
              <option value="hypnotic">Hypnotic</option>
              <option value="dither">Dither</option>
              <option value="waves">Waves</option>
              <option value="pulsar">Pulsar</option>
              <option value="pixelblast">Pixel Blast</option>
              <option value="orb">Orb</option>
              <option value="threads">Threads</option>
              <option value="seele">SEELE</option>
              <option value="color">Color</option>
              <option value="imagedither">Image Dither</option>
            </NativeSelect.Field>
          </NativeSelect.Root>
        </Field.Root>
      </Box>

      <Box
        px={3}
        py={2}
        borderBottom="1px solid"
        borderColor="rgba(255, 255, 255, 0.1)"
      >
        <Field.Root>
          <Field.Label fontSize="xs" color="gray.300" mb={2}>
            Background Opacity
          </Field.Label>
          <HStack gap={2} align="center" w="full">
            <Box flex={1} w="full" minW={0}>
              <Slider.Root
                value={[settings.opacity ?? 0.3]}
                onValueChange={(e) => {
                  onSettingsChange({
                    ...settings,
                    opacity: e.value[0],
                  });
                }}
                min={0}
                max={1}
                step={0.01}
                w="full"
                colorPalette="purple"
              >
                <Slider.Control>
                  <Slider.Track>
                    <Slider.Range />
                  </Slider.Track>
                  <Slider.Thumb index={0} />
                </Slider.Control>
              </Slider.Root>
            </Box>
            <Text
              fontSize="xs"
              color="gray.400"
              minW="45px"
              textAlign="right"
              fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
            >
              {((settings.opacity ?? 0.3) * 100).toFixed(0)}%
            </Text>
          </HStack>
        </Field.Root>
      </Box>
    </>
  );
}
