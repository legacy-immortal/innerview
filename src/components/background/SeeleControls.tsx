/**
 * @file SEELE background controls. Composes the SEELE sub-sections.
 * @module background/SeeleControls
 */
import type { JSX } from 'react';
import { memo } from 'react';
import type { BackgroundSettings } from '@/lib/settings-types';
import { VStack } from '@chakra-ui/react';
import { CollapsibleSection } from './controlFields';
import { SeeleDisplaySection } from './SeeleDisplaySection';
import { SeelePulseSection } from './SeelePulseSection';
import { SeeleTextSection } from './SeeleTextSection';

type SeeleSlice = NonNullable<BackgroundSettings['seele']>;

export interface SeeleControlsProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly settings: BackgroundSettings;
  readonly onSettingChange: <K extends keyof SeeleSlice>(
    key: K,
    value: SeeleSlice[K]
  ) => void;
  readonly onSettingsChange: (settings: BackgroundSettings) => void;
}

function SeeleControlsComponent({
  open,
  onOpenChange,
  settings,
  onSettingChange,
  onSettingsChange,
}: SeeleControlsProps): JSX.Element {
  return (
    <CollapsibleSection
      title="SEELE Settings"
      open={open}
      onOpenChange={onOpenChange}
    >
      <VStack gap={3} align="stretch">
        <SeeleTextSection
          settings={settings}
          onSettingChange={onSettingChange}
          onSettingsChange={onSettingsChange}
        />
        <SeeleDisplaySection
          settings={settings}
          onSettingChange={onSettingChange}
        />
        <SeelePulseSection
          settings={settings}
          onSettingChange={onSettingChange}
        />
      </VStack>
    </CollapsibleSection>
  );
}

/** SEELE background controls composed from text, display, and pulse sections. */
export const SeeleControls = memo(SeeleControlsComponent);
