/**
 * @file Panel for running a live transcription service end-to-end test.
 * @module components/settings/TranscriptionServiceTestPanel.tsx
 */
// Test-transcription-service panel (extracted from TranscriptionTab.tsx).
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
import { LuCheck, LuPlay, LuX } from 'react-icons/lu';
import type { TestState } from '@/hooks/useTranscriptionTest';

export interface TranscriptionServiceTestPanelProps {
  readonly testState: TestState;
  readonly lastLog: string | null;
  readonly runTranscriptionTest: () => void;
}

export function TranscriptionServiceTestPanel({
  testState,
  lastLog,
  runTranscriptionTest,
}: TranscriptionServiceTestPanelProps): JSX.Element {
  return (
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
        <HStack gap={3} align="center" w="100%" minW={0} flexWrap="wrap">
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
            <Text color="emerald.300" fontSize="xs" fontWeight="medium" mb={1}>
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
  );
}
