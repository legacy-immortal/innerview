/**
 * @file Settings tab for privacy, anonymous identity, and opt-in persistence.
 * @module components/settings/PrivacyTab.tsx
 */
import type { JSX } from 'react';
import { memo, useCallback, useState } from 'react';
import {
  Box,
  Button,
  HStack,
  NativeSelect,
  Separator,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react';
import { countRemoteMemory, deleteRemoteMemory } from '@/lib/memory-client';
import { useSettingsStore } from '@/lib/settings-store';
import type { PrivacySettings } from '@/lib/settings-types';

interface PrivacyTabProps {
  readonly privacySettings: PrivacySettings;
  readonly setPrivacySettings: React.Dispatch<
    React.SetStateAction<PrivacySettings>
  >;
}

/**
 * Privacy and persistence controls. Cloud sync and remote vector/associative
 * memory are opt-in; defaults keep data local to this device/profile.
 */
export const PrivacyTab = memo(function PrivacyTab({
  privacySettings,
  setPrivacySettings,
}: PrivacyTabProps): JSX.Element {
  const persistence = privacySettings.conversationPersistence ?? 'local';
  const remoteMemory = privacySettings.associativeMemoryRemote === true;
  const [remoteStatus, setRemoteStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const handleExportLocal = useCallback(() => {
    try {
      const settings = useSettingsStore.getState().settings;
      let conversations: unknown = null;
      try {
        const raw = localStorage.getItem('innerview-conversations');
        conversations = raw ? JSON.parse(raw) : null;
      } catch {
        conversations = null;
      }
      const payload = {
        exportedAt: new Date().toISOString(),
        note: 'Local export (conversations/settings). Remote sync/export requires opted-in deployment.',
        settings,
        conversations,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `innerview-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setRemoteStatus('Local data exported.');
    } catch (error) {
      setRemoteStatus(
        `Export failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }, []);

  const handleCountRemote = useCallback(async () => {
    setBusy(true);
    setRemoteStatus('Checking remote memory...');
    const res = await countRemoteMemory();
    setBusy(false);
    if (res.ok) {
      setRemoteStatus(
        `Remote memory documents (this installation): ${String(res.count ?? 0)}`
      );
    } else {
      setRemoteStatus(res.error || 'Failed to count remote memory.');
    }
  }, []);

  const handleDeleteRemote = useCallback(async () => {
    setBusy(true);
    setRemoteStatus('Deleting remote memory...');
    const res = await deleteRemoteMemory();
    setBusy(false);
    if (res.ok) {
      setRemoteStatus(
        'Remote associative memory deleted for this installation.'
      );
    } else {
      setRemoteStatus(res.error || 'Failed to delete remote memory.');
    }
  }, []);

  return (
    <VStack gap={4} align="stretch">
      <Text color="gray.300" fontSize="sm" fontWeight={600}>
        Privacy & Persistence
      </Text>
      <Text color="gray.500" fontSize="xs">
        Innerview works without sign-in. By default, conversations stay on this
        device. Cloud sync and remote associative/vector memory are opt-in and
        only used when you enable them.
      </Text>

      <Separator borderColor="rgba(255, 255, 255, 0.1)" />

      <VStack align="start" gap={1}>
        <Text color="gray.200" fontSize="sm">
          Anonymous installation ID
        </Text>
        <Text color="gray.500" fontSize="xs">
          A device-local identifier used to scope opt-in remote data (not an
          account). Keep it private if you enable cloud features.
        </Text>
        <Box
          w="100%"
          px={3}
          py={2}
          bg="rgba(0, 0, 0, 0.3)"
          border="1px solid"
          borderColor="rgba(255, 255, 255, 0.12)"
          borderRadius="md"
        >
          <Text color="gray.300" fontSize="xs" wordBreak="break-all">
            {privacySettings.installationId || 'Will be generated on save'}
          </Text>
        </Box>
      </VStack>

      <HStack justify="space-between" flexWrap="wrap" gap={3} align="start">
        <VStack align="start" gap={0} flex="1" minW="220px">
          <Text color="gray.200" fontSize="sm">
            Conversation persistence
          </Text>
          <Text color="gray.500" fontSize="xs">
            Local keeps conversations in this browser only. Cloud sync (opt-in)
            may store conversations on the server/DB for this installation when
            configured; availability depends on deployment.
          </Text>
        </VStack>
        <NativeSelect.Root size="sm" w={{ base: '100%', sm: '180px' }}>
          <NativeSelect.Field
            value={persistence}
            onChange={(e) =>
              setPrivacySettings((prev) => ({
                ...prev,
                conversationPersistence: e.target.value as 'local' | 'cloud',
              }))
            }
            bg="rgba(0, 0, 0, 0.3)"
            borderColor="rgba(255, 255, 255, 0.2)"
            color="gray.100"
          >
            <option value="local">Local only (default)</option>
            <option value="cloud">Cloud sync (opt-in)</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator color="gray.400" />
        </NativeSelect.Root>
      </HStack>

      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <VStack align="start" gap={0} flex="1" minW="220px">
          <Text color="gray.200" fontSize="sm">
            Remote associative/vector memory
          </Text>
          <Text color="gray.500" fontSize="xs">
            Allow embeddings/vector memory to be stored and queried via the
            configured server (e.g. Turso) for this installation. Off by
            default. Server computes embeddings by default for smooth tablet UX;
            client offload is a separate opt-in in Agent settings.
          </Text>
        </VStack>
        <Switch.Root
          checked={remoteMemory}
          onCheckedChange={(details) => {
            const checked = details?.checked === true;
            setPrivacySettings((prev) => ({
              ...prev,
              associativeMemoryRemote: checked,
            }));
          }}
          colorPalette="emerald"
        >
          <Switch.HiddenInput />
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Root>
      </HStack>

      <Separator borderColor="rgba(255, 255, 255, 0.1)" />

      <VStack align="start" gap={2}>
        <Text color="gray.200" fontSize="sm">
          Data controls
        </Text>
        <Text color="gray.500" fontSize="xs">
          Export downloads local settings and locally stored conversations from
          this browser. Remote memory actions require remote associative/vector
          memory to be enabled and saved (opt-in, scoped to this installation).
          Cloud conversation sync and retention policies are follow-ups.
        </Text>
        <HStack flexWrap="wrap" gap={2}>
          <Button size="sm" variant="outline" onClick={handleExportLocal}>
            Export local data
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCountRemote}
            disabled={!remoteMemory || busy}
          >
            Count remote memory
          </Button>
          <Button
            size="sm"
            variant="outline"
            colorPalette="red"
            onClick={handleDeleteRemote}
            disabled={!remoteMemory || busy}
          >
            Delete remote memory
          </Button>
        </HStack>
        {remoteStatus && (
          <Text color="gray.400" fontSize="xs">
            {remoteStatus}
          </Text>
        )}
      </VStack>
    </VStack>
  );
});
