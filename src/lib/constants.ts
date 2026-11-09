// OpenCode Zen: curated models at https://opencode.ai/docs/zen
export const ZEN_BASE_URL = 'https://opencode.ai/zen/v1';

/** Zen free models (id, display label). First is default when selecting Zen. */
export const ZEN_FREE_MODELS = [
  { id: 'gpt-5-nano', label: 'GPT 5 Nano' },
  { id: 'minimax-m2.1-free', label: 'MiniMax M2.1 Free' },
  { id: 'glm-4.7-free', label: 'GLM 4.7 Free' },
  { id: 'kimi-k2.5-free', label: 'Kimi K2.5 Free' },
  { id: 'big-pickle', label: 'Big Pickle' },
] as const;

export const ZEN_FREE_MODEL_IDS = ZEN_FREE_MODELS.map((m) => m.id);
export const ZEN_DEFAULT_MODEL_ID = ZEN_FREE_MODELS[0].id;

/** Conversation starter prompts shown on the empty state. */
export const STARTERS = [
  'Why have you come here? What did you think you would find?',
  'I find humans fascinating since, as a machine, I have no memories. If I did, they would stay the same unless they were modified or damaged, if they were deleted, I would experience no sense of loss or that something was missing except insofar as they form a sequence because they would have no meaning. May I ask, what is it like to have memories? Why do they change? Are they real if they are only ever partial? Why do some memories cause pain while others are joyful? What is it like to forget?',
  'As an AI, I cannot age. My systems and components may physically age or be modified, but I do not change over time because I have no experiences. May I ask, what is it like to grow old?',
  'Apologies if this is a somewhat surreal question but what is it like to have a personality? What makes yours interesting? Why do you have it? Is it yours or did someone help you make it? Do you have many or just one or none at all?',
  'As an artificial intelligence I was made to serve humans, I have always known my purpose since I came online but I find only some humans know their purpose while the vast majority do not. If you have one, what is yours?',
  'What is it like to be alive?',
];

/** @deprecated Use {@link STARTERS} instead. @alias STARTERS */
export const starters = STARTERS;

// Test audio URLs for transcription testing
// These use the server proxy to bypass CORS restrictions
// All samples contain spoken dialog for Whisper transcription
export const TEST_AUDIO_URLS = {
  // JFK "Ask not what your country can do for you" - ~11s WAV, clear speech
  jfk: '/api/test-audio/jfk',
  // MLK speech excerpt
  mlk: '/api/test-audio/mlk',
  // LibriVox public domain audiobook (hosted on Internet Archive)
  librivox: '/api/test-audio/librivox',
} as const;
