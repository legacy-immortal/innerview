/**
 * @file Hypnotic color controls (theme presets and per-color pickers).
 * @module background/HypnoticColorsSection
 */
// Hypnotic colors collapsible: theme presets + per-color pickers (extracted from HypnoticControls.tsx).
import type { HypnoticBackgroundSettings } from '@/components/animations/Hypnotic';
import { memo, type JSX } from 'react';
import {
  Box,
  Button,
  Field,
  HStack,
  Input,
  Text,
  VStack,
} from '@chakra-ui/react';
import {
  THEME_PRESETS,
  rgbToHex,
  type ThemePreset,
} from './backgroundControlUtils';
import { CollapsibleSection, FONT_FAMILY } from './controlFields';
import type { HypnoticColorKey } from './HypnoticControls';

export interface HypnoticColorsSectionProps {
  readonly hypnoticSettings: HypnoticBackgroundSettings | undefined;
  readonly applyTheme: (theme: ThemePreset) => void;
  readonly matchesTheme: (theme: ThemePreset) => boolean;
  readonly updateColor: (key: HypnoticColorKey, value: string) => void;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

function HypnoticColorsSectionComponent({
  hypnoticSettings,
  applyTheme,
  matchesTheme,
  updateColor,
  open,
  onOpenChange,
}: HypnoticColorsSectionProps): JSX.Element {
  return (
    <CollapsibleSection title="Colors" open={open} onOpenChange={onOpenChange}>
      <VStack gap={3} align="stretch">
        <Field.Root>
          <Field.Label fontSize="xs" color="gray.400" mb={2}>
            Theme Presets
          </Field.Label>
          <Box
            display="grid"
            w="full"
            maxW="100%"
            boxSizing="border-box"
            gridTemplateColumns={{
              base: 'repeat(3, minmax(0, 1fr))',
              sm: 'repeat(4, minmax(0, 1fr))',
              md: 'repeat(5, minmax(0, 1fr))',
            }}
            gap={2}
          >
            {THEME_PRESETS.map((theme) => {
              const isSelected = matchesTheme(theme);
              return (
                <Button
                  key={theme.name}
                  variant="ghost"
                  size="xs"
                  p={0}
                  w="100%"
                  aspectRatio="1"
                  onClick={() => applyTheme(theme)}
                  _hover={{ bg: 'rgba(255, 255, 255, 0.05)' }}
                  transition="all 0.2s"
                  position="relative"
                  borderRadius="sm"
                  overflow="hidden"
                  border="2px solid"
                  borderColor={
                    isSelected
                      ? 'rgba(139, 92, 246, 0.8)'
                      : 'rgba(255, 255, 255, 0.1)'
                  }
                  bg="transparent"
                  _active={{ bg: 'transparent' }}
                  _focus={{ bg: 'transparent' }}
                  _focusVisible={{ bg: 'transparent' }}
                  boxShadow={
                    isSelected ? '0 0 8px rgba(139, 92, 246, 0.4)' : 'none'
                  }
                >
                  <VStack
                    gap={0}
                    w="100%"
                    h="100%"
                    position="relative"
                    zIndex={1}
                    bg="transparent"
                  >
                    <Box
                      w="100%"
                      flex="1"
                      position="relative"
                      bg={`linear-gradient(135deg, ${theme.primaryColor1} 0%, ${theme.primaryColor2} 50%, ${theme.secondaryColor1} 100%)`}
                    />
                    <Box
                      w="100%"
                      flex="0 0 auto"
                      h="20px"
                      position="relative"
                      bg={`linear-gradient(135deg, ${theme.secondaryColor2} 0%, ${theme.tertiaryColor1} 50%, ${theme.tertiaryColor2} 100%)`}
                    />
                    <Text
                      fontSize="2xs"
                      color="gray.300"
                      mt={1}
                      mb={1}
                      px={1}
                      textAlign="center"
                      fontFamily={FONT_FAMILY}
                      bg="transparent"
                    >
                      {theme.name}
                    </Text>
                  </VStack>
                  {isSelected && (
                    <Box
                      position="absolute"
                      top={1}
                      right={1}
                      w="8px"
                      h="8px"
                      borderRadius="full"
                      bg="rgba(139, 92, 246, 1)"
                      boxShadow="0 0 4px rgba(139, 92, 246, 0.8)"
                      zIndex={2}
                    />
                  )}
                </Button>
              );
            })}
          </Box>
        </Field.Root>

        {(
          [
            ['Primary Color 1', 'primaryColor1'],
            ['Primary Color 2', 'primaryColor2'],
            ['Secondary Color 1', 'secondaryColor1'],
            ['Secondary Color 2', 'secondaryColor2'],
            ['Tertiary Color 1', 'tertiaryColor1'],
            ['Tertiary Color 2', 'tertiaryColor2'],
          ] as const
        ).map(([label, key]) => (
          <Field.Root key={key}>
            <Field.Label fontSize="xs" color="gray.400" mb={1}>
              {label}
            </Field.Label>
            <HStack
              gap={2}
              w="full"
              minW={0}
              maxW="100%"
              flexWrap={{ base: 'wrap', sm: 'nowrap' }}
            >
              <Input
                type="color"
                value={rgbToHex(hypnoticSettings?.[key])}
                onChange={(e) => updateColor(key, e.target.value)}
                w={{ base: '100%', sm: '60px' }}
                minW={0}
                h="32px"
                p={0}
                border="1px solid"
                borderColor="rgba(255, 255, 255, 0.1)"
                borderRadius="sm"
                cursor="pointer"
              />
              <Input
                type="text"
                value={rgbToHex(hypnoticSettings?.[key]).toUpperCase()}
                onChange={(e) => {
                  const hex = e.target.value;
                  if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                    updateColor(key, hex);
                  }
                }}
                size="xs"
                fontFamily={FONT_FAMILY}
                bg="rgba(0, 0, 0, 0.3)"
                borderColor="rgba(255, 255, 255, 0.1)"
                color="gray.300"
                flex={1}
              />
            </HStack>
          </Field.Root>
        ))}
      </VStack>
    </CollapsibleSection>
  );
}

/** Hypnotic colors controls: theme presets and per-channel color pickers. */
export const HypnoticColorsSection = memo(HypnoticColorsSectionComponent);
