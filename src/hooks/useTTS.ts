import { ttsService } from '@/lib/tts/tts-service';
import { isTextUIPart, TextPart, type UIMessage } from 'ai';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseTTSOptions {
  enabled: boolean;
  messages?: UIMessage[];
  isLoading?: boolean;
}

interface UseTTSReturn {
  isTTSSpeaking: boolean;
  isUsingKokoro: boolean;
  isPlayingMP3: boolean;
  analyserNode: AnalyserNode | null;
  audioElement: HTMLAudioElement | null;
  speakMessage: (text: string) => Promise<void>;
  stopTTS: () => void;
  handleMP3FileLoad: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const useTTS = ({
  enabled,
  messages = [],
  isLoading = false,
}: UseTTSOptions): UseTTSReturn => {
  const [isTTSSpeaking, setIsTTSSpeaking] = useState(false);
  const [isUsingKokoro, setIsUsingKokoro] = useState(false);
  const [isPlayingMP3, setIsPlayingMP3] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ttsResultRef = useRef<Awaited<
    ReturnType<typeof ttsService.speak>
  > | null>(null);

  const speakMessage = useCallback(
    async (text: string) => {
      if (!enabled) return;

      try {
        setIsTTSSpeaking(true);

        // Generate speech using streaming TTS service
        const result = await ttsService.speak(text);
        ttsResultRef.current = result;

        // Get analyser node for visualization (streaming audio)
        const analyserNode = result.getAnalyserNode();
        if (analyserNode) {
          analyserRef.current = analyserNode;
          setIsUsingKokoro(true);
        } else {
          // Browser TTS fallback - no analyser node
          analyserRef.current = null;
          setIsUsingKokoro(false);
        }

        // Set up cleanup on stop
        const originalStop = result.stop;
        result.stop = async () => {
          await originalStop();
          setIsTTSSpeaking(false);
          analyserRef.current = null;
          ttsResultRef.current = null;
        };
      } catch (error) {
        console.error('TTS error:', error);
        setIsTTSSpeaking(false);
        analyserRef.current = null;
        ttsResultRef.current = null;
        setIsUsingKokoro(false);
      }
    },
    [enabled]
  );

  const stopTTS = useCallback(() => {
    ttsService.stop();
    if (ttsResultRef.current) {
      ttsResultRef.current.stop();
    }
    setIsTTSSpeaking(false);
    setIsPlayingMP3(false);
    analyserRef.current = null;
    if (audioRef.current && audioRef.current instanceof HTMLAudioElement) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  const handleMP3FileLoad = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith('audio/')) {
        return;
      }

      // Stop any current TTS
      stopTTS();

      // Create audio element from file
      const audioUrl = URL.createObjectURL(file);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Set up event listeners
      audio.addEventListener('play', () => {
        setIsPlayingMP3(true);
        setIsTTSSpeaking(true);
        setIsUsingKokoro(true);
      });

      audio.addEventListener('ended', () => {
        setIsPlayingMP3(false);
        setIsTTSSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      });

      audio.addEventListener('error', () => {
        setIsPlayingMP3(false);
        setIsTTSSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      });

      // Play the audio
      audio.play().catch(console.error);
    },
    [stopTTS]
  );

  // Speak new assistant messages when TTS is enabled
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage &&
      lastMessage.role === 'assistant' &&
      enabled &&
      !isTTSSpeaking &&
      !isLoading
    ) {
      const parts = lastMessage.parts?.filter(
        (part) => part != null && isTextUIPart(part)
      );
      const textPart = parts?.find((part) => part.type === 'text') as TextPart;
      const textContent = textPart?.text?.trim() ?? '';

      if (textContent.trim()) {
        speakMessage(textContent);
      }
    }
  }, [messages, enabled, isTTSSpeaking, isLoading, speakMessage]);

  // Cleanup TTS when component unmounts or TTS is disabled
  useEffect(() => {
    if (!enabled && isTTSSpeaking) {
      stopTTS();
    }

    return () => {
      ttsService.stop();
    };
  }, [enabled, isTTSSpeaking, stopTTS]);

  return {
    isTTSSpeaking,
    isUsingKokoro,
    isPlayingMP3,
    analyserNode: analyserRef.current,
    audioElement: audioRef.current,
    speakMessage,
    stopTTS,
    handleMP3FileLoad,
  };
};
