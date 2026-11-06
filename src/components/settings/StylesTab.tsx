import { memo } from 'react';
import { VStack, Separator, Field, NativeSelect } from '@chakra-ui/react';
import type { StyleSettings, LayoutMode } from '@/lib/settings-types';
import { ColorPickerField } from './ColorPickerField';

interface StylesTabProps {
  styleSettings: StyleSettings;
  setStyleSettings: React.Dispatch<React.SetStateAction<StyleSettings>>;
}

export const StylesTab = memo(function StylesTab({
  styleSettings,
  setStyleSettings,
}: StylesTabProps) {
  const safeStyleSettings = styleSettings || {};
  const currentMode = safeStyleSettings.mode || 'condensed';

  return (
    <VStack gap={4} align="stretch">
      <Field.Root>
        <Field.Label color="gray.300">Layout Mode</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          Choose the layout style: Condensed (current), Corpo (ChatGPT-like), or
          Terminal (fullscreen terminal)
        </Field.HelperText>
        <NativeSelect.Root>
          <NativeSelect.Field
            value={currentMode}
            onChange={(e) => {
              const value = e.currentTarget?.value;
              if (value) {
                setStyleSettings((prev) => ({
                  ...(prev || {}),
                  mode: value as LayoutMode,
                }));
              }
            }}
            bg="rgba(255, 255, 255, 0.05)"
            borderColor="rgba(255, 255, 255, 0.1)"
            color="white"
            _focus={{ borderColor: 'emerald.400' }}
            fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
          >
            <option value="condensed">Condensed</option>
            <option value="corpo">Corpo</option>
            <option value="terminal">Terminal</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Field.Root>

      <Separator borderColor="rgba(255, 255, 255, 0.1)" />
      <ColorPickerField
        label="Sidebar Background Color"
        helperText='Set the background color for the left sidebar. Use "transparent" to see the animation behind it.'
        value={safeStyleSettings.sidebarBackgroundColor}
        defaultValue="transparent"
        onChange={(value) =>
          setStyleSettings((prev) => ({
            ...(prev || {}),
            sidebarBackgroundColor: value,
          }))
        }
        onReset={() =>
          setStyleSettings((prev) => ({
            ...(prev || {}),
            sidebarBackgroundColor: 'transparent',
          }))
        }
      />

      <Separator borderColor="rgba(255, 255, 255, 0.1)" />

      <ColorPickerField
        label="Sidebar Header Background Color"
        helperText="Background color for header sections in the sidebar"
        value={safeStyleSettings.sidebarHeaderBackgroundColor}
        defaultValue="transparent"
        onChange={(value) =>
          setStyleSettings((prev) => ({
            ...(prev || {}),
            sidebarHeaderBackgroundColor: value,
          }))
        }
        onReset={() =>
          setStyleSettings((prev) => ({
            ...(prev || {}),
            sidebarHeaderBackgroundColor: 'transparent',
          }))
        }
      />

      <Separator borderColor="rgba(255, 255, 255, 0.1)" />

      <ColorPickerField
        label="Conversation Item Background Color"
        helperText="Default background color for conversation list items"
        value={safeStyleSettings.sidebarConversationItemBackgroundColor}
        defaultValue="transparent"
        onChange={(value) =>
          setStyleSettings((prev) => ({
            ...(prev || {}),
            sidebarConversationItemBackgroundColor: value,
          }))
        }
        onReset={() =>
          setStyleSettings((prev) => ({
            ...(prev || {}),
            sidebarConversationItemBackgroundColor: 'transparent',
          }))
        }
      />

      <ColorPickerField
        label="Conversation Item Hover Background Color"
        helperText="Background color when hovering over conversation items"
        value={safeStyleSettings.sidebarConversationItemHoverBackgroundColor}
        defaultValue="rgba(255, 255, 255, 0.02)"
        onChange={(value) =>
          setStyleSettings((prev) => ({
            ...(prev || {}),
            sidebarConversationItemHoverBackgroundColor: value,
          }))
        }
        onReset={() =>
          setStyleSettings((prev) => ({
            ...(prev || {}),
            sidebarConversationItemHoverBackgroundColor:
              'rgba(255, 255, 255, 0.02)',
          }))
        }
      />

      <ColorPickerField
        label="Conversation Item Active Background Color"
        helperText="Background color for the currently selected conversation item"
        value={safeStyleSettings.sidebarConversationItemActiveBackgroundColor}
        defaultValue="rgba(255, 255, 255, 0.05)"
        onChange={(value) =>
          setStyleSettings((prev) => ({
            ...(prev || {}),
            sidebarConversationItemActiveBackgroundColor: value,
          }))
        }
        onReset={() =>
          setStyleSettings((prev) => ({
            ...(prev || {}),
            sidebarConversationItemActiveBackgroundColor:
              'rgba(255, 255, 255, 0.05)',
          }))
        }
      />

      <Separator borderColor="rgba(255, 255, 255, 0.1)" />

      <ColorPickerField
        label="Prompt Input Background Color"
        helperText="Background color for the message input field at the bottom of the chat"
        value={safeStyleSettings.promptInputBackgroundColor}
        defaultValue="transparent"
        onChange={(value) =>
          setStyleSettings((prev) => ({
            ...(prev || {}),
            promptInputBackgroundColor: value,
          }))
        }
        onReset={() =>
          setStyleSettings((prev) => ({
            ...(prev || {}),
            promptInputBackgroundColor: 'transparent',
          }))
        }
      />
    </VStack>
  );
});
