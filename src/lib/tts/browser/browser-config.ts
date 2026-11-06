// Browser TTS Configuration

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }

  return window.speechSynthesis.getVoices();
}

