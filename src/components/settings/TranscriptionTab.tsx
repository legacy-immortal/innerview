import type { TranscriptionSettings } from '@/lib/settings-types';
import {
  testTranscriptionService,
  transcriptionService,
  type TranscriptionSegment,
  type TranscriptionTestProgress,
} from '@/lib/transcription';
import {
  Box,
  Button,
  Field,
  HStack,
  Input,
  NativeSelect,
  Progress,
  Switch,
  Text,
  VStack,
  useConst,
} from '@chakra-ui/react';
import { memo, useCallback, useRef, useState } from 'react';
import { LuCheck, LuMic, LuPlay, LuUpload, LuX } from 'react-icons/lu';

interface TranscriptionTabProps {
  transcriptionSettings: TranscriptionSettings;
  updateTranscriptionSetting: <K extends keyof TranscriptionSettings>(
    key: K,
    value: TranscriptionSettings[K]
  ) => void;
  updateOpenAISetting: <
    K extends keyof NonNullable<TranscriptionSettings['openai']>,
  >(
    key: K,
    value: NonNullable<TranscriptionSettings['openai']>[K]
  ) => void;
  updateLocalSetting: <
    K extends keyof NonNullable<TranscriptionSettings['local']>,
  >(
    key: K,
    value: NonNullable<TranscriptionSettings['local']>[K]
  ) => void;
}

interface TestState {
  status: 'idle' | 'running' | 'success' | 'error';
  progress: number;
  message: string;
  result?: string;
  error?: string;
  segments?: TranscriptionSegment[];
  logs: string[]; // Recent log messages
}

export const TranscriptionTab = memo(function TranscriptionTab({
  transcriptionSettings,
  updateTranscriptionSetting,
  updateOpenAISetting,
  updateLocalSetting,
}: TranscriptionTabProps) {
  const transcriptionModels = useConst([
    'whisper-1',
    'gpt-4o-mini-transcribe',
    'gpt-4o-transcribe',
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Test state
  const [testState, setTestState] = useState<TestState>({
    status: 'idle',
    progress: 0,
    message: '',
    logs: [],
  });

  // Custom audio file state
  const [loadedFile, setLoadedFile] = useState<{
    file: File;
    url: string;
  } | null>(null);
  const [customTestState, setCustomTestState] = useState<TestState>({
    status: 'idle',
    progress: 0,
    message: '',
    logs: [],
  });

  const lastLog =
    testState.logs.length > 0
      ? testState.logs[testState.logs.length - 1]
      : null;

  const customLastLog =
    customTestState.logs.length > 0
      ? customTestState.logs[customTestState.logs.length - 1]
      : null;

  const handleLoadMP3 = () => fileInputRef.current?.click();

  const onMP3FileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Revoke old URL if exists
    if (loadedFile?.url) {
      URL.revokeObjectURL(loadedFile.url);
    }

    const url = URL.createObjectURL(file);
    setLoadedFile({ file, url });
    setCustomTestState({
      status: 'idle',
      progress: 0,
      message: '',
      logs: [],
    });

    // Set audio source for playback
    if (audioRef.current) {
      audioRef.current.src = url;
    }

    e.target.value = '';
  };

  // Transcribe the loaded custom audio file
  const transcribeLoadedFile = useCallback(async () => {
    if (!loadedFile) return;

    setCustomTestState({
      status: 'running',
      progress: 10,
      message: 'Reading audio file...',
      logs: ['Reading audio file...'],
    });

    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await loadedFile.file.arrayBuffer();

      setCustomTestState((prev) => ({
        ...prev,
        progress: 30,
        message: 'Transcribing audio...',
        logs: [...prev.logs, 'Transcribing audio...'],
      }));

      // Use the transcription service
      const result = await transcriptionService.transcribe(arrayBuffer, {
        provider: transcriptionSettings.provider,
      });

      setCustomTestState({
        status: 'success',
        progress: 100,
        message: 'Transcription complete',
        result: result.text,
        segments: result.segments,
        logs: ['Transcription complete'],
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setCustomTestState({
        status: 'error',
        progress: 0,
        message: 'Transcription failed',
        error: errorMsg,
        logs: [`Error: ${errorMsg}`],
      });
    }
  }, [loadedFile, transcriptionSettings.provider]);

  // Run transcription test
  const runTranscriptionTest = useCallback(async () => {
    setTestState({
      status: 'running',
      progress: 0,
      message: 'Starting transcription test...',
      logs: ['Starting transcription test...'],
    });

    try {
      const mode = transcriptionSettings.local?.mode || 'browser';
      const result = await testTranscriptionService(
        (progress: TranscriptionTestProgress) => {
          setTestState((prev) => ({
            ...prev,
            progress: progress.progress,
            message: progress.message,
            // Append new log message if different from last
            logs:
              prev.logs[prev.logs.length - 1] !== progress.message
                ? [...prev.logs.slice(-4), progress.message] // Keep last 5 logs
                : prev.logs,
            // Store segments when complete
            segments: progress.result?.segments,
          }));
        },
        {
          provider: transcriptionSettings.provider,
          useShortSample: true,
          // Use backend API when mode is 'backend', otherwise use direct service
          testBackendAPI:
            transcriptionSettings.provider === 'local' && mode === 'backend',
        }
      );

      if (result.success) {
        setTestState((prev) => ({
          status: 'success',
          progress: 100,
          message: 'Test completed successfully',
          result: result.text,
          segments: prev.segments,
          logs: [...prev.logs.slice(-4), 'Test completed successfully'],
        }));
      } else {
        setTestState((prev) => ({
          status: 'error',
          progress: 0,
          message: 'Test failed',
          error: result.error,
          logs: [...prev.logs.slice(-4), `Error: ${result.error}`],
        }));
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setTestState((prev) => ({
        status: 'error',
        progress: 0,
        message: 'Test failed',
        error: errorMsg,
        logs: [...prev.logs.slice(-4), `Error: ${errorMsg}`],
      }));
    }
  }, [transcriptionSettings.provider, transcriptionSettings.local?.mode]);

  return (
    <VStack gap={4} align="stretch">
      <Field.Root>
        <Field.Label color="gray.300">Transcription Provider</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          Select the transcription provider to use
        </Field.HelperText>
        <NativeSelect.Root>
          <NativeSelect.Field
            value={transcriptionSettings.provider}
            onChange={(e) =>
              updateTranscriptionSetting(
                'provider',
                e.currentTarget.value as 'openai' | 'local'
              )
            }
            bg="rgba(255, 255, 255, 0.05)"
            borderColor="rgba(255, 255, 255, 0.1)"
            color="white"
            _focus={{ borderColor: 'emerald.400' }}
          >
            <option value="openai">OpenAI (Cloud)</option>
            <option value="local">Local (Browser/Backend)</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Field.Root>

      {transcriptionSettings.provider === 'openai' && (
        <VStack
          gap={3}
          align="stretch"
          pl={4}
          borderLeft="1px solid"
          borderColor="rgba(255, 255, 255, 0.1)"
        >
          <Field.Root>
            <Field.Label color="gray.300">Model</Field.Label>
            <Field.HelperText color="gray.500" fontSize="xs">
              OpenAI transcription model
            </Field.HelperText>
            <NativeSelect.Root>
              <NativeSelect.Field
                value={transcriptionSettings.openai?.modelId || 'whisper-1'}
                onChange={(e) =>
                  updateOpenAISetting('modelId', e.currentTarget.value)
                }
                bg="rgba(255, 255, 255, 0.05)"
                borderColor="rgba(255, 255, 255, 0.1)"
                color="white"
                _focus={{ borderColor: 'emerald.400' }}
              >
                {transcriptionModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>

          <Field.Root>
            <Field.Label color="gray.300">Language</Field.Label>
            <Field.HelperText color="gray.500" fontSize="xs">
              Language code (optional, e.g., en, es, fr)
            </Field.HelperText>
            <Input
              value={transcriptionSettings.openai?.language || ''}
              onChange={(e) =>
                updateOpenAISetting(
                  'language',
                  e.currentTarget.value || undefined
                )
              }
              bg="rgba(255, 255, 255, 0.05)"
              borderColor="rgba(255, 255, 255, 0.1)"
              color="white"
              _focus={{ borderColor: 'emerald.400' }}
              placeholder="Auto-detect"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label color="gray.300">Timestamp Granularities</Field.Label>
            <Field.HelperText color="gray.500" fontSize="xs">
              Include word-level or segment-level timestamps
            </Field.HelperText>
            <VStack gap={2} align="stretch">
              <HStack>
                <input
                  type="checkbox"
                  checked={transcriptionSettings.openai?.timestampGranularities?.includes(
                    'word'
                  )}
                  onChange={(e) => {
                    const current =
                      transcriptionSettings.openai?.timestampGranularities ||
                      [];
                    const updated = e.currentTarget.checked
                      ? [...current, 'word']
                      : current.filter((g) => g !== 'word');
                    updateOpenAISetting(
                      'timestampGranularities',
                      updated.length > 0
                        ? (updated as ('word' | 'segment')[])
                        : undefined
                    );
                  }}
                  style={{
                    accentColor: '#10b981',
                  }}
                />
                <Text color="gray.200" fontSize="sm">
                  Word-level timestamps
                </Text>
              </HStack>
              <HStack>
                <input
                  type="checkbox"
                  checked={transcriptionSettings.openai?.timestampGranularities?.includes(
                    'segment'
                  )}
                  onChange={(e) => {
                    const current =
                      transcriptionSettings.openai?.timestampGranularities ||
                      [];
                    const updated = e.currentTarget.checked
                      ? [...current, 'segment']
                      : current.filter((g) => g !== 'segment');
                    updateOpenAISetting(
                      'timestampGranularities',
                      updated.length > 0
                        ? (updated as ('word' | 'segment')[])
                        : undefined
                    );
                  }}
                  style={{
                    accentColor: '#10b981',
                  }}
                />
                <Text color="gray.200" fontSize="sm">
                  Segment-level timestamps
                </Text>
              </HStack>
            </VStack>
          </Field.Root>
        </VStack>
      )}

      {transcriptionSettings.provider === 'local' && (
        <VStack
          gap={3}
          align="stretch"
          pl={4}
          borderLeft="1px solid"
          borderColor="rgba(255, 255, 255, 0.1)"
        >
          <Field.Root>
            <Field.Label color="gray.300">Processing Mode</Field.Label>
            <Field.HelperText color="gray.500" fontSize="xs">
              Browser runs locally in your browser, Backend uses the server
            </Field.HelperText>
            <NativeSelect.Root>
              <NativeSelect.Field
                value={transcriptionSettings.local?.mode || 'browser'}
                onChange={(e) =>
                  updateLocalSetting(
                    'mode',
                    e.currentTarget.value as 'browser' | 'backend'
                  )
                }
                bg="rgba(255, 255, 255, 0.05)"
                borderColor="rgba(255, 255, 255, 0.1)"
                color="white"
                _focus={{ borderColor: 'emerald.400' }}
              >
                <option value="browser">Browser (Transformers.js)</option>
                <option value="backend">Backend (Server API)</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>

          <Field.Root>
            <Field.Label color="gray.300">Model</Field.Label>
            <Field.HelperText color="gray.500" fontSize="xs">
              Local transcription model (Hugging Face model ID)
            </Field.HelperText>
            <Input
              value={
                transcriptionSettings.local?.modelId || 'Xenova/whisper-base'
              }
              onChange={(e) =>
                updateLocalSetting('modelId', e.currentTarget.value)
              }
              bg="rgba(255, 255, 255, 0.05)"
              borderColor="rgba(255, 255, 255, 0.1)"
              color="white"
              _focus={{ borderColor: 'emerald.400' }}
              placeholder="Xenova/whisper-base"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label color="gray.300">Language</Field.Label>
            <Field.HelperText color="gray.500" fontSize="xs">
              Language code (optional, e.g., en, es, fr)
            </Field.HelperText>
            <Input
              value={transcriptionSettings.local?.language || ''}
              onChange={(e) =>
                updateLocalSetting(
                  'language',
                  e.currentTarget.value || undefined
                )
              }
              bg="rgba(255, 255, 255, 0.05)"
              borderColor="rgba(255, 255, 255, 0.1)"
              color="white"
              _focus={{ borderColor: 'emerald.400' }}
              placeholder="Auto-detect"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label color="gray.300">Task</Field.Label>
            <Field.HelperText color="gray.500" fontSize="xs">
              Transcribe or translate audio
            </Field.HelperText>
            <NativeSelect.Root>
              <NativeSelect.Field
                value={transcriptionSettings.local?.task || 'transcribe'}
                onChange={(e) =>
                  updateLocalSetting(
                    'task',
                    e.currentTarget.value as 'transcribe' | 'translate'
                  )
                }
                bg="rgba(255, 255, 255, 0.05)"
                borderColor="rgba(255, 255, 255, 0.1)"
                color="white"
                _focus={{ borderColor: 'emerald.400' }}
              >
                <option value="transcribe">Transcribe</option>
                <option value="translate">Translate</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>

          <HStack justify="space-between">
            <VStack align="start" gap={0}>
              <Text color="gray.200" fontSize="sm">
                Quantized Model
              </Text>
              <Text color="gray.500" fontSize="xs">
                Use quantized model for faster loading
              </Text>
            </VStack>
            <Switch.Root
              checked={transcriptionSettings.local?.quantized !== false}
              onCheckedChange={(e) =>
                updateLocalSetting('quantized', e.checked)
              }
              colorPalette="emerald"
            >
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Root>
          </HStack>
        </VStack>
      )}

      {/* Test Transcription Service */}
      <Field.Root
        pt={4}
        borderTopWidth="1px"
        borderColor="rgba(255, 255, 255, 0.1)"
      >
        <Field.Label color="gray.300">Test Transcription Service</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          Downloads a sample audio file and tests the transcription pipeline
        </Field.HelperText>
        <VStack gap={3} align="stretch" mt={2}>
          {/* Button and log display row - full width, single last log, no scroll */}
          <HStack gap={3} align="center" w="100%" minW={0}>
            <Button
              size="sm"
              variant="outline"
              colorPalette={
                testState.status === 'success'
                  ? 'green'
                  : testState.status === 'error'
                    ? 'red'
                    : 'emerald'
              }
              onClick={runTranscriptionTest}
              disabled={testState.status === 'running'}
              flexShrink={0}
            >
              <HStack gap={2}>
                {testState.status === 'running' ? (
                  <Box
                    as="span"
                    w="14px"
                    h="14px"
                    borderRadius="full"
                    border="2px solid"
                    borderColor="emerald.400"
                    borderTopColor="transparent"
                    animation="spin 1s linear infinite"
                  />
                ) : testState.status === 'success' ? (
                  <LuCheck />
                ) : testState.status === 'error' ? (
                  <LuX />
                ) : (
                  <LuPlay />
                )}
                <Text>
                  {testState.status === 'running'
                    ? 'Testing...'
                    : testState.status === 'success'
                      ? 'Test Passed'
                      : testState.status === 'error'
                        ? 'Test Failed'
                        : 'Run Test'}
                </Text>
              </HStack>
            </Button>

            {/* Log display - last log only, no scrollbar */}
            {lastLog && (
              <Box
                flex={1}
                minW={0}
                p={2}
                bg="rgba(0, 0, 0, 0.3)"
                borderRadius="md"
                fontFamily="mono"
                fontSize="xs"
                overflow="hidden"
                whiteSpace="nowrap"
                textOverflow="ellipsis"
              >
                <Text
                  color={
                    lastLog.startsWith('Error')
                      ? 'red.400'
                      : lastLog.includes('complete')
                        ? 'emerald.400'
                        : 'gray.400'
                  }
                  lineHeight="1.4"
                  title={lastLog}
                >
                  {lastLog}
                </Text>
              </Box>
            )}
          </HStack>

          {/* Progress bar */}
          {testState.status === 'running' && (
            <Box>
              <Progress.Root
                value={testState.progress}
                size="sm"
                colorPalette="emerald"
              >
                <Progress.Track bg="rgba(255, 255, 255, 0.1)">
                  <Progress.Range />
                </Progress.Track>
              </Progress.Root>
            </Box>
          )}

          {/* Success result */}
          {testState.status === 'success' && testState.result && (
            <Box
              p={3}
              bg="rgba(16, 185, 129, 0.1)"
              border="1px solid"
              borderColor="rgba(16, 185, 129, 0.3)"
              borderRadius="md"
            >
              <Text
                color="emerald.300"
                fontSize="xs"
                fontWeight="medium"
                mb={1}
              >
                Transcription Result:
              </Text>
              <Text color="gray.200" fontSize="sm">
                {testState.result.length > 200
                  ? `${testState.result.substring(0, 200)}...`
                  : testState.result}
              </Text>
            </Box>
          )}

          {/* Segments display */}
          {testState.status === 'success' &&
            testState.segments &&
            testState.segments.length > 0 && (
              <Box
                p={3}
                bg="rgba(59, 130, 246, 0.1)"
                border="1px solid"
                borderColor="rgba(59, 130, 246, 0.3)"
                borderRadius="md"
              >
                <Text color="blue.300" fontSize="xs" fontWeight="medium" mb={2}>
                  Segments ({testState.segments.length}):
                </Text>
                <VStack gap={1} align="stretch" maxH="120px" overflowY="auto">
                  {testState.segments.map((segment, i) => (
                    <HStack key={i} gap={2} fontSize="xs">
                      <Text color="gray.500" fontFamily="mono" flexShrink={0}>
                        [{segment.startSecond.toFixed(1)}s -{' '}
                        {segment.endSecond.toFixed(1)}s]
                      </Text>
                      <Text color="gray.300" flex={1}>
                        {segment.text}
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              </Box>
            )}

          {/* Error message */}
          {testState.status === 'error' && testState.error && (
            <Box
              p={3}
              bg="rgba(239, 68, 68, 0.1)"
              border="1px solid"
              borderColor="rgba(239, 68, 68, 0.3)"
              borderRadius="md"
            >
              <Text color="red.300" fontSize="xs" fontWeight="medium" mb={1}>
                Error:
              </Text>
              <Text color="gray.200" fontSize="sm">
                {testState.error}
              </Text>
            </Box>
          )}
        </VStack>
      </Field.Root>

      {/* Test with Custom Audio */}
      <Field.Root
        pt={4}
        borderTopWidth="1px"
        borderColor="rgba(255, 255, 255, 0.1)"
      >
        <Field.Label color="gray.300">Test with Custom Audio</Field.Label>
        <Field.HelperText color="gray.500" fontSize="xs">
          Load an audio file to test transcription with your own audio
        </Field.HelperText>
        <VStack gap={3} align="stretch" mt={2}>
          <HStack gap={2}>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              style={{ display: 'none' }}
              onChange={onMP3FileChange}
            />
            <Button
              size="sm"
              variant="outline"
              colorPalette="cyan"
              onClick={handleLoadMP3}
            >
              <HStack gap={2}>
                <LuUpload />
                <Text>Load Audio File</Text>
              </HStack>
            </Button>

            {loadedFile && (
              <Button
                size="sm"
                variant="outline"
                colorPalette={
                  customTestState.status === 'success'
                    ? 'green'
                    : customTestState.status === 'error'
                      ? 'red'
                      : 'emerald'
                }
                onClick={transcribeLoadedFile}
                disabled={customTestState.status === 'running'}
              >
                <HStack gap={2}>
                  {customTestState.status === 'running' ? (
                    <Box
                      as="span"
                      w="14px"
                      h="14px"
                      borderRadius="full"
                      border="2px solid"
                      borderColor="emerald.400"
                      borderTopColor="transparent"
                      animation="spin 1s linear infinite"
                    />
                  ) : customTestState.status === 'success' ? (
                    <LuCheck />
                  ) : customTestState.status === 'error' ? (
                    <LuX />
                  ) : (
                    <LuMic />
                  )}
                  <Text>Transcribe</Text>
                </HStack>
              </Button>
            )}
          </HStack>

          {/* Loaded file info and audio player */}
          {loadedFile && (
            <Box
              p={3}
              bg="rgba(0, 0, 0, 0.3)"
              borderRadius="md"
              border="1px solid"
              borderColor="rgba(255, 255, 255, 0.1)"
            >
              <Text color="gray.400" fontSize="xs" mb={2}>
                Loaded: {loadedFile.file.name} (
                {(loadedFile.file.size / 1024).toFixed(1)} KB)
              </Text>
              <audio
                ref={audioRef}
                controls
                style={{ width: '100%', height: '32px' }}
              />
            </Box>
          )}

          {/* Progress bar for custom transcription */}
          {customTestState.status === 'running' && (
            <Box>
              <Progress.Root
                value={customTestState.progress}
                size="sm"
                colorPalette="emerald"
              >
                <Progress.Track bg="rgba(255, 255, 255, 0.1)">
                  <Progress.Range />
                </Progress.Track>
              </Progress.Root>
              {customLastLog && (
                <Text color="gray.400" fontSize="xs" mt={1}>
                  {customLastLog}
                </Text>
              )}
            </Box>
          )}

          {/* Success result for custom transcription */}
          {customTestState.status === 'success' && customTestState.result && (
            <Box
              p={3}
              bg="rgba(16, 185, 129, 0.1)"
              border="1px solid"
              borderColor="rgba(16, 185, 129, 0.3)"
              borderRadius="md"
            >
              <Text
                color="emerald.300"
                fontSize="xs"
                fontWeight="medium"
                mb={1}
              >
                Transcription Result:
              </Text>
              <Text color="gray.200" fontSize="sm">
                {customTestState.result.length > 500
                  ? `${customTestState.result.substring(0, 500)}...`
                  : customTestState.result}
              </Text>
            </Box>
          )}

          {/* Segments display for custom transcription */}
          {customTestState.status === 'success' &&
            customTestState.segments &&
            customTestState.segments.length > 0 && (
              <Box
                p={3}
                bg="rgba(59, 130, 246, 0.1)"
                border="1px solid"
                borderColor="rgba(59, 130, 246, 0.3)"
                borderRadius="md"
              >
                <Text color="blue.300" fontSize="xs" fontWeight="medium" mb={2}>
                  Segments ({customTestState.segments.length}):
                </Text>
                <VStack gap={1} align="stretch" maxH="120px" overflowY="auto">
                  {customTestState.segments.map((segment, i) => (
                    <HStack key={i} gap={2} fontSize="xs">
                      <Text color="gray.500" fontFamily="mono" flexShrink={0}>
                        [{segment.startSecond.toFixed(1)}s -{' '}
                        {segment.endSecond.toFixed(1)}s]
                      </Text>
                      <Text color="gray.300" flex={1}>
                        {segment.text}
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              </Box>
            )}

          {/* Error message for custom transcription */}
          {customTestState.status === 'error' && customTestState.error && (
            <Box
              p={3}
              bg="rgba(239, 68, 68, 0.1)"
              border="1px solid"
              borderColor="rgba(239, 68, 68, 0.3)"
              borderRadius="md"
            >
              <Text color="red.300" fontSize="xs" fontWeight="medium" mb={1}>
                Error:
              </Text>
              <Text color="gray.200" fontSize="sm">
                {customTestState.error}
              </Text>
            </Box>
          )}
        </VStack>
      </Field.Root>
    </VStack>
  );
});
