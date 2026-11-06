'use client';

import { getThemeForPerformance } from '@/lib/chakra-theme';
import { useSettingsStore } from '@/lib/settings-store';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ColorModeProvider, type ColorModeProviderProps } from './color-mode';

export function Provider(props: ColorModeProviderProps) {
  // Use useShallow to prevent re-renders when performance settings haven't changed
  const performanceSettings = useSettingsStore(
    useShallow((state) => state.settings?.performance ?? null)
  );

  const theme = useMemo(() => {
    if (!performanceSettings) {
      return defaultSystem;
    }

    return getThemeForPerformance(
      performanceSettings.chakraAnimationsEnabled,
      performanceSettings.reducedMotion
    );
  }, [performanceSettings]);

  return (
    <ChakraProvider value={theme}>
      <ColorModeProvider {...props} />
    </ChakraProvider>
  );
}
