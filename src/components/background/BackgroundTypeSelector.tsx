/**
 * @file Background type selector. Dropdown for the background type plus the opacity slider.
 * @module background/BackgroundTypeSelector
 */
import type { JSX } from 'react';
import { memo } from 'react';
import type { BackgroundSettings, BackgroundType } from '@/lib/settings-types';
import {
  Box,
  Field,
  HStack,
  NativeSelect,
  Slider,
  Text,
} from '@chakra-ui/react';
import { FONT_FAMILY } from './controlFields';

interface BackgroundTypeSelectorProps {
  readonly settings: BackgroundSettings;
  readonly onSettingsChange: (settings: BackgroundSettings) => void;
  readonly currentBackgroundType: BackgroundType;
  readonly onBackgroundTypeChange: (type: BackgroundType) => void;
}

function BackgroundTypeSelectorComponent({
  settings,
  onSettingsChange,
  currentBackgroundType,
  onBackgroundTypeChange,
}: BackgroundTypeSelectorProps): JSX.Element {
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
          <HStack
            gap={2}
            align="center"
            w="full"
            maxW="100%"
            flexWrap={{ base: 'wrap', sm: 'nowrap' }}
            touchAction="none"
          >
            <Box
              flex={1}
              w="full"
              minW={0}
              maxW="100%"
              flexBasis={{ base: '100%', sm: 'auto' }}
            >
              <Slider.Root
                touchAction="none"
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
              fontFamily={FONT_FAMILY}
            >
              {((settings.opacity ?? 0.3) * 100).toFixed(0)}%
            </Text>
          </HStack>
        </Field.Root>
      </Box>
    </>
  );
}

/** Dropdown for selecting the background type and adjusting background opacity. */
export const BackgroundTypeSelector = memo(BackgroundTypeSelectorComponent);
