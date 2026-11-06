import {
  Button,
  Dialog,
  HStack,
  IconButton,
  Portal,
  Tabs,
  Text,
} from '@chakra-ui/react';
import { LuX } from 'react-icons/lu';
import { useEffect, useState } from 'react';
import { AgentTab } from './settings/AgentTab';
import { GenerationTab } from './settings/GenerationTab';
import { KeyboardTab } from './settings/KeyboardTab';
import { PerformanceTab } from './settings/PerformanceTab';
import { StylesTab } from './settings/StylesTab';
import { TTSTab } from './settings/TTSTab';
import { TranscriptionTab } from './settings/TranscriptionTab';
import { useSettingsModal } from './settings/useSettingsModal';

type TabValue =
  | 'performance'
  | 'tts'
  | 'transcription'
  | 'keyboard'
  | 'styles'
  | 'generation'
  | 'agent';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('performance');
  useEffect(() => {
    if (!isOpen) setActiveTab('performance');
  }, [isOpen]);
  const {
    performance,
    tts,
    transcription,
    keyboard,
    style,
    generation,
    agent: _agent,
    meta,
    actions,
  } = useSettingsModal(isOpen);

  const handleSave = () => {
    actions.save();
    onClose();
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(details) => {
        if (!details.open) {
          onClose();
        }
      }}
      closeOnInteractOutside={false}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            position="relative"
            maxW={['90vw', '70vw', '900px']}
            bg="rgba(0, 0, 0, 0.9)"
            border="1px solid"
            borderColor="rgba(255, 255, 255, 0.1)"
            fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
          >
            <Dialog.Header position="relative" pb={4} pr={8}>
              <Dialog.Title color="white" fontSize="lg" mb={2}>
                Settings
              </Dialog.Title>
              <IconButton
                position="absolute"
                top={2}
                right={2}
                size="sm"
                variant="ghost"
                colorPalette="gray"
                onClick={onClose}
                aria-label="Close settings"
                css={{
                  '&:hover': {
                    bg: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                <LuX />
              </IconButton>
            </Dialog.Header>
            <Dialog.Body>
              <Dialog.Description color="gray.400" fontSize="sm" mb={4}>
                {meta.detectedTier && (
                  <Text>
                    Detected performance tier:{' '}
                    <strong>{meta.detectedTier}</strong>
                  </Text>
                )}
                {performance.settings.autoDetected && (
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Settings were auto-detected based on your device
                  </Text>
                )}
              </Dialog.Description>

              <Tabs.Root
                value={activeTab}
                onValueChange={(e) =>
                  setActiveTab((e.value as TabValue) ?? 'performance')
                }
                colorPalette="cyan"
                variant="line"
                size="sm"
                fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
              >
                <Tabs.List
                  borderBottom="1px solid"
                  borderColor="rgba(255, 255, 255, 0.1)"
                  mb={4}
                >
                  <Tabs.Trigger
                    value="performance"
                    css={{
                      textShadow: '0 0 4px rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    Performance
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="tts"
                    css={{
                      textShadow: '0 0 4px rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    TTS
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="transcription"
                    css={{
                      textShadow: '0 0 4px rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    Transcription
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="keyboard"
                    css={{
                      textShadow: '0 0 4px rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    Keyboard
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="styles"
                    css={{
                      textShadow: '0 0 4px rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    Styles
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="generation"
                    css={{
                      textShadow: '0 0 4px rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    Generation
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="agent"
                    css={{
                      textShadow: '0 0 4px rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    Agent
                  </Tabs.Trigger>
                </Tabs.List>

                {activeTab === 'performance' && (
                  <Tabs.Content value="performance">
                    <PerformanceTab
                      settings={performance.settings}
                      updateSetting={performance.updateSetting}
                      handleTierChange={performance.handleTierChange}
                    />
                  </Tabs.Content>
                )}
                {activeTab === 'tts' && (
                  <Tabs.Content value="tts">
                    <TTSTab
                      ttsSettings={tts.settings}
                      browserVoices={tts.browserVoices}
                      updateTTSSetting={tts.updateSetting}
                      updateKokoroSetting={tts.updateKokoro}
                      updateBrowserSetting={tts.updateBrowser}
                    />
                  </Tabs.Content>
                )}
                {activeTab === 'transcription' && (
                  <Tabs.Content value="transcription">
                    <TranscriptionTab
                      transcriptionSettings={transcription.settings}
                      updateTranscriptionSetting={transcription.updateSetting}
                      updateOpenAISetting={transcription.updateOpenAI}
                      updateLocalSetting={transcription.updateLocal}
                    />
                  </Tabs.Content>
                )}
                {activeTab === 'keyboard' && (
                  <Tabs.Content value="keyboard">
                    <KeyboardTab
                      keyboardSettings={keyboard.settings}
                      setKeyboardSettings={keyboard.updateSetting}
                    />
                  </Tabs.Content>
                )}
                {activeTab === 'styles' && (
                  <Tabs.Content value="styles">
                    <StylesTab
                      styleSettings={style.settings}
                      setStyleSettings={style.updateSetting}
                    />
                  </Tabs.Content>
                )}
                {activeTab === 'generation' && (
                  <Tabs.Content value="generation">
                    <GenerationTab
                      generationSettings={generation.settings}
                      connectionStatus={generation.connectionStatus}
                      connectionError={generation.connectionError}
                      setGenerationSettings={generation.updateSetting}
                      testConnection={generation.testConnection}
                    />
                  </Tabs.Content>
                )}
                {activeTab === 'agent' && (
                  <Tabs.Content value="agent">
                    <AgentTab
                      generationSettings={generation.settings}
                      setGenerationSettings={generation.updateSetting}
                    />
                  </Tabs.Content>
                )}
              </Tabs.Root>

              <HStack gap={2} justify="flex-end" mt={6}>
                <Button
                  variant="ghost"
                  colorPalette="gray"
                  onClick={actions.reset}
                  size="sm"
                  fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                  css={{
                    textShadow: '0 0 4px rgba(255, 255, 255, 0.08)',
                  }}
                >
                  Reset to Auto
                </Button>
                <Button
                  variant="ghost"
                  colorPalette="gray"
                  onClick={onClose}
                  size="sm"
                  fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                  css={{
                    textShadow: '0 0 4px rgba(255, 255, 255, 0.08)',
                  }}
                >
                  Cancel
                </Button>
                <Button
                  colorPalette="emerald"
                  onClick={handleSave}
                  size="sm"
                  fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
                  css={{
                    textShadow: '0 0 4px rgba(16, 185, 129, 0.5)',
                  }}
                >
                  Save
                </Button>
              </HStack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
