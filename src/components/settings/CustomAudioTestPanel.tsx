/**
 * @file Panel for loading a custom audio file and running a transcription test.
 * @module components/settings/CustomAudioTestPanel.tsx
 */
// Test-with-custom-audio panel (extracted from TranscriptionTab.tsx).
import type { JSX } from 'react';
import {
  Box,
  Button,
  Field,
  HStack,
  Progress,
  Text,
  VStack,
} from '@chakra-ui/react';
import { LuCheck, LuMic, LuUpload, LuX } from 'react-icons/lu';
import type { TestState } from '@/hooks/useTranscriptionTest';

/**
 * Props for {@link CustomAudioTestPanel}.
 */
export interface CustomAudioTestPanelProps {
  /** Ref to the hidden file input used to pick the custom audio file. */
  readonly fileInputRef: React.RefObject<HTMLInputElement | null>;
  /** Ref to the <audio> element used to preview the loaded file. */
  readonly audioRef: React.RefObject<HTMLAudioElement | null>;
  /** The loaded file plus its blob URL, or null when none is loaded. */
  readonly loadedFile: { file: File; url: string } | null;
  /** Current state of the custom-file transcription test. */
  readonly customTestState: TestState;
  /** Last log line from the custom transcription test, if any. */
  readonly customLastLog: string | null;
  /** Fired when the user clicks "Load Audio File". */
  readonly handleLoadMP3: () => void;
  /** Fired when the file input selection changes. */
  readonly onMP3FileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Fired when the user clicks "Transcribe" on the loaded file. */
  readonly transcribeLoadedFile: () => void;
}

/**
 * Panel for loading a custom audio file and running a transcription test.
 *
 * Renders the file picker, a preview player, a transcribe button whose color
 * reflects the test status, and the result/segments/error display. Extracted
 * from {@link TranscriptionTab}.
 *
 * @see {@link TestState} consumed via {@link customTestState}
 */
export function CustomAudioTestPanel({
  fileInputRef,
  audioRef,
  loadedFile,
  customTestState,
  customLastLog,
  handleLoadMP3,
  onMP3FileChange,
  transcribeLoadedFile,
}: CustomAudioTestPanelProps): JSX.Element {
  return (
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
            <Text color="emerald.300" fontSize="xs" fontWeight="medium" mb={1}>
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
  );
}
