/**
 * @file TranscriptionButton.tsx — Voice-recording button with live waveform feedback.
 * @module components/chat/shared/TranscriptionButton
 *
 * Voice-recording button with live waveform feedback. Supports controlled mode (external state
 * from keyboard shortcuts) and standalone mode, with microphone availability checks, error
 * formatting, push-to-talk key display, and a circular waveform visualization while recording.
 * Consumed by `ChatInput`.
 */

// Transcription Button Component with recording indicator and visualization
import { CircularWaveform } from '@/components/animations/CircularWaveform';
import { useTranscription } from '@/hooks/useTranscription';
import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react';
import type { JSX } from 'react';
import { useCallback, useEffect, useState } from 'react';

// Terminal-style text shadow for consistency
const textShadowStyles = {
  textShadow: '0 0 4px rgba(255, 255, 255, 0.08)',
};

const terminalButtonStyles = {
  fontFamily:
    "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace",
  fontSize: 'sm',
  letterSpacing: '0.05em',
  border: '1px solid',
  borderColor: 'rgba(255, 255, 255, 0.1)',
  bg: 'rgba(0, 0, 0, 0.6)',
  backdropFilter: 'blur(8px)',
  color: 'white',
  transition: 'all 0.2s ease',
  _hover: {
    borderColor: 'rgba(34, 211, 238, 0.4)',
    bg: 'rgba(0, 0, 0, 0.8)',
    boxShadow:
      '0 0 12px rgba(34, 211, 238, 0.15), inset 0 0 8px rgba(34, 211, 238, 0.08)',
  },
  _active: {
    borderColor: 'rgba(34, 211, 238, 0.6)',
    bg: 'rgba(0, 0, 0, 0.9)',
  },
  _disabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};

const recordingButtonStyles = {
  ...terminalButtonStyles,
  borderColor: 'rgba(239, 68, 68, 0.4)',
  bg: 'rgba(0, 0, 0, 0.8)',
  boxShadow:
    '0 0 12px rgba(239, 68, 68, 0.3), inset 0 0 8px rgba(239, 68, 68, 0.15)',
  _hover: {
    borderColor: 'rgba(239, 68, 68, 0.6)',
    boxShadow:
      '0 0 16px rgba(239, 68, 68, 0.4), inset 0 0 10px rgba(239, 68, 68, 0.2)',
  },
};

export interface TranscriptionButtonProps {
  /**
   * Callback when transcription completes
   */
  readonly onTranscriptionComplete?: (text: string) => void;

  /**
   * Provider to use: 'openai' for production, 'local' for development
   */
  readonly provider?: 'openai' | 'local';

  /**
   * Language hint in ISO-639-1 format (e.g., 'en')
   */
  readonly language?: string;

  /**
   * Model ID to use
   */
  readonly modelId?: string;

  /**
   * Whether to show visualization
   */
  readonly showVisualization?: boolean;

  /**
   * Size of the button
   */
  readonly size?: 'sm' | 'md' | 'lg';

  /**
   * Custom key for push-to-talk (default: '`')
   */
  readonly pushToTalkKey?: string;

  /**
   * Whether to enable push-to-talk keyboard shortcut (default: true)
   * Set to false when using global keyboard shortcuts
   */
  readonly enablePushToTalk?: boolean;

  /** When true, button is disabled (e.g. while chat is streaming to avoid parallel load). */
  readonly disabled?: boolean;

  // Controlled mode props - when provided, use external transcription state and callbacks
  /** When provided with onStopRecording, mouse uses these and display uses only external state (single source of truth). */
  readonly onStartRecording?: () => void;
  /** When provided with onStartRecording, mouse uses these and display uses only external state. */
  readonly onStopRecording?: () => void;
  /** External recording state (for keyboard shortcut triggered recording) */
  readonly externalIsRecording?: boolean;
  /** External transcribing state */
  readonly externalIsTranscribing?: boolean;
  /** External audio level for visualization */
  readonly externalAudioLevel?: number;
  /** Error from parent transcription hook (shown when in controlled mode). */
  readonly externalError?: Error | null;
}

function isTranscriptionAvailable(): boolean {
  if (typeof navigator === 'undefined') return false;
  const hasMediaDevices = Boolean(navigator.mediaDevices?.getUserMedia);
  const hasLegacy = Boolean(
    (navigator as { getUserMedia?: unknown }).getUserMedia
  );
  const hasRecorder =
    typeof MediaRecorder !== 'undefined' &&
    typeof MediaRecorder.isTypeSupported === 'function';
  return (hasMediaDevices || hasLegacy) && hasRecorder;
}

function formatTranscriptionError(error: Error): string {
  const name = (error as { name?: string }).name ?? '';
  const msg = error.message || '';
  if (
    name === 'NotAllowedError' ||
    /not allowed|permission denied|denied/i.test(msg)
  ) {
    return 'Microphone access was denied. Allow microphone permission in your browser, then try again.';
  }
  if (
    name === 'NotFoundError' ||
    /requested device not found|no microphone|no.*input device/i.test(msg)
  ) {
    return 'No microphone was found. Connect a microphone and try again.';
  }
  if (
    name === 'NotReadableError' ||
    /could not start|hardware|in use/i.test(msg)
  ) {
    return 'The microphone is unavailable or in use by another app. Close other apps using the mic and try again.';
  }
  if (
    name === 'SecurityError' ||
    /not allowed by the user agent|secure context|https/i.test(msg)
  ) {
    return 'Microphone access requires a secure page (HTTPS) or localhost. Open the app on a secure origin and try again.';
  }
  if (/opt-in|not enabled/i.test(msg)) {
    return msg;
  }
  return msg || 'Transcription failed. Try again.';
}

/**
 * Voice-recording button with live waveform feedback.
 *
 * @param props - Transcription button props.
 * @returns The transcription button element.
 */
export function TranscriptionButton({
  onTranscriptionComplete,
  onStartRecording,
  onStopRecording,
  provider = 'openai',
  language,
  modelId,
  showVisualization = true,
  size: _size = 'md',
  pushToTalkKey = '`',
  enablePushToTalk = false,
  disabled = false,
  externalIsRecording,
  externalIsTranscribing,
  externalAudioLevel,
  externalError,
}: TranscriptionButtonProps): JSX.Element {
  const isControlled = onStartRecording != null && onStopRecording != null;

  const {
    isRecording: internalIsRecording,
    isTranscribing: internalIsTranscribing,
    audioLevel: internalAudioLevel,
    startRecording,
    stopRecording,
    cancelRecording: _cancelRecording,
    result: _result,
    error: internalError,
  } = useTranscription({
    provider,
    language,
    modelId,
    pushToTalkKey,
    enablePushToTalk,
    onTranscriptionComplete: (transcriptionResult) => {
      const text = transcriptionResult?.text;
      if (text != null) onTranscriptionComplete?.(text);
    },
  });

  // Controlled mode: single source of truth from parent (keyboard + click use same hook)
  // Standalone: merge external and internal state
  const isRecording = isControlled
    ? (externalIsRecording ?? false)
    : externalIsRecording || internalIsRecording;
  const isTranscribing = isControlled
    ? (externalIsTranscribing ?? false)
    : externalIsTranscribing || internalIsTranscribing;
  const audioLevel = isControlled
    ? (externalAudioLevel ?? 0)
    : (externalAudioLevel ?? internalAudioLevel);
  const error = isControlled
    ? (externalError ?? null)
    : (externalError ?? internalError);

  const handleMouseDown = () => {
    if (isControlled) {
      if (!isRecording && !isTranscribing) onStartRecording?.();
    } else if (
      !externalIsRecording &&
      !internalIsRecording &&
      !isTranscribing
    ) {
      startRecording();
    }
  };

  const handleMouseUp = () => {
    if (isControlled) {
      if (isRecording) onStopRecording?.();
    } else if (internalIsRecording) {
      stopRecording();
    }
  };

  const handleMouseLeave = () => {
    if (isControlled) {
      if (isRecording) onStopRecording?.();
    } else if (internalIsRecording) {
      stopRecording();
    }
  };

  // Check microphone permission upfront so we can disable the button
  // instead of showing an error after the user clicks.
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);

  const checkMicrophonePermission = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.permissions) return;
    try {
      const permission = await navigator.permissions.query({
        name: 'microphone',
      });
      if (permission.state === 'denied') {
        setMicPermissionDenied(true);
      }
    } catch {
      // Permissions API may not support 'microphone' in all browsers;
      // fall back to API-existence check only.
    }
  }, []);

  useEffect(() => {
    checkMicrophonePermission();
  }, [checkMicrophonePermission]);

  const isAvailable = isTranscriptionAvailable() && !micPermissionDenied;

  const getButtonText = () => {
    if (!isAvailable) {
      return 'Mic unavailable';
    }
    if (isRecording) {
      return '[REC]';
    }
    if (isTranscribing) {
      return '[TRANSCRIBING...]';
    }
    return `Hold ${pushToTalkKey} to talk`;
  };

  const buttonTitle = !isAvailable
    ? 'Voice input is unavailable: microphone access or recording is not supported in this browser/context.'
    : isRecording
      ? 'Recording… release to transcribe.'
      : isTranscribing
        ? 'Transcribing…'
        : `Press and hold to dictate, or hold ${pushToTalkKey} (push-to-talk).`;

  return (
    <VStack gap={2} align="center" w="auto" maxW="100%">
      <Box position="relative" w="100%" minW={0} touchAction="none">
        <Button
          aria-label={
            isAvailable
              ? 'Voice input (hold to dictate)'
              : 'Voice input unavailable'
          }
          title={buttonTitle}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          loading={isTranscribing}
          disabled={disabled || isTranscribing || !isAvailable}
          w="100%"
          minWidth={{ base: '120px', sm: '140px' }}
          maxW="100%"
          py={1.5}
          px={2}
          touchAction="none"
          css={isRecording ? recordingButtonStyles : terminalButtonStyles}
        >
          <HStack gap={1.5} align="center" justify="center">
            {/* Reserve space so layout does not shift when recording starts */}
            <Box
              w="6px"
              h="6px"
              flexShrink={0}
              borderRadius="full"
              bg="red.400"
              opacity={isRecording ? 1 : 0}
              visibility={isRecording ? 'visible' : 'hidden'}
              css={{
                boxShadow: isRecording
                  ? '0 0 6px rgba(239, 68, 68, 0.8), 0 0 12px rgba(239, 68, 68, 0.4)'
                  : 'none',
                animation: isRecording
                  ? 'pulse 1.5s ease-in-out infinite'
                  : 'none',
              }}
            />
            <Text
              fontFamily="inherit"
              fontSize="xs"
              fontWeight={600}
              letterSpacing="0.1em"
              css={textShadowStyles}
            >
              {getButtonText()}
            </Text>
          </HStack>
        </Button>

        {showVisualization && isRecording && (
          <Box
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            pointerEvents="none"
            zIndex={1}
            w="min(120px, 30vw)"
            h="min(120px, 30vw)"
          >
            <CircularWaveform
              isActive={isRecording}
              settings={{
                pointCount: 64,
                breathingEnabled: true,
                breathingSpeed: 0.05,
                breathingIntensity: 0.2,
                radius: 0.3,
                barWidth: 0.015,
                barLengthMultiplier: Math.max(0.3, audioLevel * 0.8),
                animationSpeed: 0.8,
                animationSpeedIrregular: 0.5,
                animationSpeedHighFreq: 0.9,
                amplitudePowerAudio: audioLevel,
                amplitudePowerSynthetic: audioLevel,
                glowOpacityBase: 0.2,
                glowOpacityRange: 0.15,
              }}
              layers={[
                {
                  id: '1',
                  color: '#ef4444',
                  offset: 0,
                  amplitude: audioLevel * 0.5,
                  frequency: 2.5,
                  phase: 0,
                },
              ]}
            />
          </Box>
        )}
      </Box>

      {error && (
        <HStack gap={2} align="center" w="100%">
          <Text
            fontSize="xs"
            color="red.400"
            fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
            letterSpacing="0.05em"
            css={{
              textShadow:
                '0 0 8px rgba(239, 68, 68, 0.5), 0 0 16px rgba(239, 68, 68, 0.3)',
            }}
          >
            [ERROR]
          </Text>
          <Text
            fontSize="xs"
            color="gray.400"
            fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
            css={textShadowStyles}
          >
            › {formatTranscriptionError(error)}
          </Text>
        </HStack>
      )}
    </VStack>
  );
}
