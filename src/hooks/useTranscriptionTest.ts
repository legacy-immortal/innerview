// Transcription test state/handlers hook (extracted from TranscriptionTab.tsx).
import type { TranscriptionSettings } from '@/lib/settings-types';
import {
  testTranscriptionService,
  transcriptionService,
  type TranscriptionSegment,
  type TranscriptionTestProgress,
} from '@/lib/transcription';
import { useConst } from '@chakra-ui/react';
import { useCallback, useRef, useState } from 'react';

export interface TestState {
  status: 'idle' | 'running' | 'success' | 'error';
  progress: number;
  message: string;
  result?: string;
  error?: string;
  segments?: TranscriptionSegment[];
  logs: string[]; // Recent log messages
}

export function useTranscriptionTest(
  transcriptionSettings: TranscriptionSettings
) {
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

  return {
    transcriptionModels,
    fileInputRef,
    audioRef,
    testState,
    loadedFile,
    customTestState,
    lastLog,
    customLastLog,
    handleLoadMP3,
    onMP3FileChange,
    transcribeLoadedFile,
    runTranscriptionTest,
  };
}
