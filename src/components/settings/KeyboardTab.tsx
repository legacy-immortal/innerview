import { memo } from 'react';
import {
  VStack,
  HStack,
  Text,
  Field,
  Input,
  Separator,
  Switch,
} from '@chakra-ui/react';
import type { KeyboardSettings } from '@/lib/settings-types';

interface KeyboardTabProps {
  keyboardSettings: KeyboardSettings;
  setKeyboardSettings: React.Dispatch<React.SetStateAction<KeyboardSettings>>;
}

export const KeyboardTab = memo(function KeyboardTab({
  keyboardSettings,
  setKeyboardSettings,
}: KeyboardTabProps) {
  return (
    <VStack gap={4} align="stretch">
      <HStack justify="space-between">
        <VStack align="start" gap={0}>
          <Text color="gray.200" fontSize="sm">
            Enable Keyboard Shortcuts
          </Text>
          <Text color="gray.500" fontSize="xs">
            Enable or disable all keyboard shortcuts
          </Text>
        </VStack>
        <Switch.Root
          checked={keyboardSettings.enabled}
          onCheckedChange={(e) =>
            setKeyboardSettings((prev) => ({
              ...prev,
              enabled: e.checked,
            }))
          }
          colorPalette="emerald"
        >
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Root>
      </HStack>

      <Separator borderColor="rgba(255, 255, 255, 0.1)" />

      <Field.Root>
        <Field.Label color="gray.300">Transcription Key</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          Key to hold for push-to-talk transcription (backtick by default)
        </Field.HelperText>
        <Input
          value={keyboardSettings.transcriptionKey}
          onChange={(e) =>
            setKeyboardSettings((prev) => ({
              ...prev,
              transcriptionKey: e.currentTarget.value,
            }))
          }
          bg="rgba(255, 255, 255, 0.05)"
          borderColor="rgba(255, 255, 255, 0.1)"
          color="white"
          _focus={{ borderColor: 'emerald.400' }}
          placeholder="`"
          maxLength={1}
          onKeyDown={(e) => {
            const key = e.key;
            if (key.length === 1) {
              e.preventDefault();
              setKeyboardSettings((prev) => ({
                ...prev,
                transcriptionKey: key,
              }));
            } else if (
              key === 'Backspace' ||
              key === 'Delete' ||
              key === 'Escape'
            ) {
              e.preventDefault();
              setKeyboardSettings((prev) => ({
                ...prev,
                transcriptionKey: '`',
              }));
            }
          }}
        />
        <Field.HelperText color="gray.500" fontSize="xs" mt={1}>
          Press any key to set it as the transcription key
        </Field.HelperText>
      </Field.Root>

      <Separator borderColor="rgba(255, 255, 255, 0.1)" />

      <Field.Root>
        <Field.Label color="gray.300">Submit Keypress</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          Key combination to submit the prompt. Use format like
          &quot;shift+enter&quot;, &quot;enter&quot;, &quot;ctrl+enter&quot;,
          etc. Press the keys to set.
        </Field.HelperText>
        <Input
          value={keyboardSettings.submitKeypress || 'shift+enter'}
          onChange={(e) =>
            setKeyboardSettings((prev) => ({
              ...prev,
              submitKeypress: e.target.value,
            }))
          }
          bg="rgba(255, 255, 255, 0.05)"
          borderColor="rgba(255, 255, 255, 0.1)"
          color="white"
          _focus={{ borderColor: 'emerald.400' }}
          fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
          placeholder="shift+enter"
          onKeyDown={(e) => {
            const parts: string[] = [];
            if (e.ctrlKey || e.metaKey) parts.push('ctrl');
            if (e.altKey) parts.push('alt');
            if (e.shiftKey) parts.push('shift');

            const key = e.key.toLowerCase();
            if (
              key !== 'control' &&
              key !== 'alt' &&
              key !== 'shift' &&
              key !== 'meta'
            ) {
              parts.push(key);
              e.preventDefault();
              setKeyboardSettings((prev) => ({
                ...prev,
                submitKeypress: parts.join('+'),
              }));
            }
          }}
        />
        <Field.HelperText color="gray.500" fontSize="xs" mt={1}>
          Press the key combination to set it. Examples: shift+enter, enter,
          ctrl+enter
        </Field.HelperText>
      </Field.Root>

      <Separator borderColor="rgba(255, 255, 255, 0.1)" />

      <Field.Root>
        <Field.Label color="gray.300">Previous Visualization Key</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          Key to cycle to previous visualization (comma by default)
        </Field.HelperText>
        <Input
          value={keyboardSettings.prevVisualizationKey ?? ','}
          onChange={(e) =>
            setKeyboardSettings((prev) => ({
              ...prev,
              prevVisualizationKey: e.currentTarget.value || ',',
            }))
          }
          bg="rgba(255, 255, 255, 0.05)"
          borderColor="rgba(255, 255, 255, 0.1)"
          color="white"
          _focus={{ borderColor: 'emerald.400' }}
          placeholder=","
          maxLength={1}
          onKeyDown={(e) => {
            const key = e.key;
            if (key.length === 1) {
              e.preventDefault();
              setKeyboardSettings((prev) => ({
                ...prev,
                prevVisualizationKey: key,
              }));
            } else if (
              key === 'Backspace' ||
              key === 'Delete' ||
              key === 'Escape'
            ) {
              e.preventDefault();
              setKeyboardSettings((prev) => ({
                ...prev,
                prevVisualizationKey: ',',
              }));
            }
          }}
        />
      </Field.Root>

      <Field.Root>
        <Field.Label color="gray.300">Next Visualization Key</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          Key to cycle to next visualization (period by default)
        </Field.HelperText>
        <Input
          value={keyboardSettings.nextVisualizationKey ?? '.'}
          onChange={(e) =>
            setKeyboardSettings((prev) => ({
              ...prev,
              nextVisualizationKey: e.currentTarget.value || '.',
            }))
          }
          bg="rgba(255, 255, 255, 0.05)"
          borderColor="rgba(255, 255, 255, 0.1)"
          color="white"
          _focus={{ borderColor: 'emerald.400' }}
          placeholder="."
          maxLength={1}
          onKeyDown={(e) => {
            const key = e.key;
            if (key.length === 1) {
              e.preventDefault();
              setKeyboardSettings((prev) => ({
                ...prev,
                nextVisualizationKey: key,
              }));
            } else if (
              key === 'Backspace' ||
              key === 'Delete' ||
              key === 'Escape'
            ) {
              e.preventDefault();
              setKeyboardSettings((prev) => ({
                ...prev,
                nextVisualizationKey: '.',
              }));
            }
          }}
        />
      </Field.Root>

      <Field.Root>
        <Field.Label color="gray.300">Exit Terminal Mode Key</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          Key combination to exit terminal layout (ctrl+shift+e by default)
        </Field.HelperText>
        <Input
          value={keyboardSettings.exitTerminalKey ?? 'ctrl+shift+e'}
          onChange={(e) =>
            setKeyboardSettings((prev) => ({
              ...prev,
              exitTerminalKey: e.target.value || 'ctrl+shift+e',
            }))
          }
          bg="rgba(255, 255, 255, 0.05)"
          borderColor="rgba(255, 255, 255, 0.1)"
          color="white"
          _focus={{ borderColor: 'emerald.400' }}
          fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
          placeholder="ctrl+shift+e"
          onKeyDown={(e) => {
            const parts: string[] = [];
            if (e.ctrlKey || e.metaKey) parts.push('ctrl');
            if (e.altKey) parts.push('alt');
            if (e.shiftKey) parts.push('shift');

            const key = e.key.toLowerCase();
            if (
              key !== 'control' &&
              key !== 'alt' &&
              key !== 'shift' &&
              key !== 'meta'
            ) {
              parts.push(key);
              e.preventDefault();
              setKeyboardSettings((prev) => ({
                ...prev,
                exitTerminalKey: parts.join('+'),
              }));
            }
          }}
        />
        <Field.HelperText color="gray.500" fontSize="xs" mt={1}>
          Press the key combination. Example: ctrl+shift+e
        </Field.HelperText>
      </Field.Root>
    </VStack>
  );
});
