// Transcription Button Component with recording indicator and visualization
import { CircularWaveform } from '@/components/animations/CircularWaveform';
import { useTranscription } from '@/hooks/useTranscription';
import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react';

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
  onTranscriptionComplete?: (text: string) => void;

  /**
   * Provider to use: 'openai' for production, 'local' for development
   */
  provider?: 'openai' | 'local';

  /**
   * Language hint in ISO-639-1 format (e.g., 'en')
   */
  language?: string;

  /**
   * Model ID to use
   */
  modelId?: string;

  /**
   * Whether to show visualization
   */
  showVisualization?: boolean;

  /**
   * Size of the button
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Custom key for push-to-talk (default: '`')
   */
  pushToTalkKey?: string;

  /**
   * Whether to enable push-to-talk keyboard shortcut (default: true)
   * Set to false when using global keyboard shortcuts
   */
  enablePushToTalk?: boolean;

  /** When true, button is disabled (e.g. while chat is streaming to avoid parallel load). */
  disabled?: boolean;

  // Controlled mode props - when provided, use external transcription state and callbacks
  /** When provided with onStopRecording, mouse uses these and display uses only external state (single source of truth). */
  onStartRecording?: () => void;
  /** When provided with onStartRecording, mouse uses these and display uses only external state. */
  onStopRecording?: () => void;
  /** External recording state (for keyboard shortcut triggered recording) */
  externalIsRecording?: boolean;
  /** External transcribing state */
  externalIsTranscribing?: boolean;
  /** External audio level for visualization */
  externalAudioLevel?: number;
  /** Error from parent transcription hook (shown when in controlled mode). */
  externalError?: Error | null;
}

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
}: TranscriptionButtonProps) {
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

  const getButtonText = () => {
    if (isRecording) {
      return '[REC]';
    }
    if (isTranscribing) {
      return '[TRANSCRIBING...]';
    }
    return `[HOLD ${pushToTalkKey.toUpperCase()}]`;
  };

  return (
    <VStack gap={2} align="center" w="100%">
      <Box position="relative" w="100%">
        <Button
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          loading={isTranscribing}
          disabled={disabled || isTranscribing}
          w="100%"
          minWidth="140px"
          py={1.5}
          px={2}
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
            w="120px"
            h="120px"
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
            › {error.message}
          </Text>
        </HStack>
      )}
    </VStack>
  );
}
