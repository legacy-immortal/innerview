import { MemorySaver } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { createAgent } from 'langchain';
import { getConfig } from '../config/index.js';
import { createLogger } from '../logger.js';
import { vectorStore } from '../memory/vector-store.js';
import {
  associativeMemoryMiddleware,
  contextSchema,
  conversationMetadataMiddleware,
  createEthicalGuardrailsMiddleware,
  createSummarizationMiddleware,
  dynamicPromptMiddleware,
  getGuardrailsModel,
  messageTimestampMiddleware,
} from './middlewares.js';
import { TtlCache, hashText } from '../utils/cache.js';
import { recallEntityTool, recallSpecificTool } from './tools.js';

const logger = createLogger('Agents');

// Constants
const DEFAULT_BASE_URL = 'http://localhost:5001/v1';
const DEFAULT_MODEL_NAME = 'gpt-5';

/** OpenCode Zen base URL; when used, API key comes from ZEN_API_KEY env */
export const ZEN_BASE_URL = 'https://opencode.ai/zen/v1';
const DEFAULT_TEMPERATURE = 0.8;
const DEFAULT_MAX_TOKENS = 512;

// Provider availability cache (avoid repeated checks). Keyed by
// baseURL + whether a custom API key was supplied: the previous
// single-slot cache could return one provider's status for another.
const providerAvailabilityCache = new TtlCache<string, ProviderStatus>({
  ttlMs: 30_000,
  maxEntries: 32,
});

export type ProviderStatus = {
  available: boolean;
  error?: string;
  suggestion?: string;
};

// Check if the AI provider is available
export const checkProviderAvailability = async (
  customBaseURL?: string,
  customApiKey?: string
): Promise<ProviderStatus> => {
  const baseURL = customBaseURL || DEFAULT_BASE_URL;
  const cacheKey = `${baseURL}\n${customApiKey ? 'key' : 'anon'}`;

  const cached = providerAvailabilityCache.get(cacheKey);
  if (cached) return cached;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const authHeader = customApiKey
      ? `Bearer ${customApiKey}`
      : 'Bearer sk-proj-dummy';

    const response = await fetch(`${baseURL}/models`, {
      method: 'GET',
      headers: { Authorization: authHeader },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      const status: ProviderStatus = { available: true };
      providerAvailabilityCache.set(cacheKey, status);
      return status;
    }

    const error = `Provider returned status ${response.status}`;
    const status: ProviderStatus = { available: false, error };
    providerAvailabilityCache.set(cacheKey, status);
    return status;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const isTimeout =
      errorMessage.includes('abort') || errorMessage.includes('timeout');
    const isConnectionRefused =
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('fetch failed');

    const formattedError = isTimeout
      ? 'Connection timeout - provider not responding'
      : isConnectionRefused
        ? 'Connection refused - provider not running'
        : errorMessage;

    const suggestion =
      baseURL === DEFAULT_BASE_URL
        ? 'Start a local LLM server (e.g., LM Studio, Ollama) on port 5001, or configure OPENAI_BASE_URL in server/.env'
        : 'Check your API key and network connection';

    const status: ProviderStatus = {
      available: false,
      error: formattedError,
      suggestion,
    };
    providerAvailabilityCache.set(cacheKey, status);
    return status;
  }
};

// Types
export type ModelConfig = {
  baseURL?: string;
  apiKey?: string;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  seed?: number;
};

export type AgentSettings = {
  enableAssociativeMemory?: boolean;
  enableSummaryMemory?: boolean;
  enableConstitutionMiddleware?: boolean;
  enableAppealProcess?: boolean;
};

export type GenerationSettings = ModelConfig & AgentSettings;

// Cache ChatOpenAI clients by effective config; constructing a client
// per request was pure overhead (no per-request state inside).
const modelCache = new TtlCache<string, ChatOpenAI>({
  ttlMs: 10 * 60_000,
  maxEntries: 32,
});

// Initialize the reasoning model with configurable parameters
export const getModel = (config?: ModelConfig): ChatOpenAI => {
  const cacheKey = hashText(JSON.stringify(config ?? {}));
  const cached = modelCache.get(cacheKey);
  if (cached) return cached;

  const baseURL = config?.baseURL || DEFAULT_BASE_URL;
  const apiKey = config?.apiKey || 'sk-proj-dummy';
  const modelConfig: ConstructorParameters<typeof ChatOpenAI>[0] = {
    openAIApiKey: apiKey,
    configuration: { baseURL },
    modelName: config?.modelName || DEFAULT_MODEL_NAME,
    temperature: config?.temperature ?? DEFAULT_TEMPERATURE,
    maxTokens: config?.maxTokens ?? DEFAULT_MAX_TOKENS,
    ...(config?.topP !== undefined && { topP: config.topP }),
    ...(config?.frequencyPenalty !== undefined && {
      frequencyPenalty: config.frequencyPenalty,
    }),
    ...(config?.presencePenalty !== undefined && {
      presencePenalty: config.presencePenalty,
    }),
    ...(config?.stopSequences &&
      config.stopSequences.length > 0 && { stop: config.stopSequences }),
  };

  const model = new ChatOpenAI(modelConfig);
  modelCache.set(cacheKey, model);
  return model;
};

// Shared checkpointer for conversation persistence
const checkpointer = new MemorySaver();

// Build middleware array based on agent settings
const buildMiddleware = (baseURL: string, settings?: AgentSettings) => {
  const middleware = [
    conversationMetadataMiddleware,
    messageTimestampMiddleware,
  ];

  if (settings?.enableConstitutionMiddleware) {
    middleware.push(dynamicPromptMiddleware);
  }

  if (settings?.enableAssociativeMemory) {
    middleware.push(associativeMemoryMiddleware);
  }

  if (settings?.enableSummaryMemory) {
    middleware.push(
      createSummarizationMiddleware(() =>
        getGuardrailsModel(baseURL)
      ) as unknown as
        | typeof conversationMetadataMiddleware
        | typeof messageTimestampMiddleware
    );
  }

  if (settings?.enableAppealProcess) {
    middleware.push(
      createEthicalGuardrailsMiddleware(() => getGuardrailsModel(baseURL))
    );
  }

  return middleware;
};

// Cache built agents per (model, settings) pair; createAgent wiring
// (middleware construction, graph compilation) is the heavy part and
// the result is stateless across threads (state lives in checkpointer).
type InterlocutorAgent = ReturnType<typeof createAgent>;
const agentCache = new TtlCache<string, InterlocutorAgent>({
  ttlMs: 10 * 60_000,
  maxEntries: 8,
});

// Create the interlocutor agent
export const initializeInterlocutor = (
  modelConfig?: ModelConfig,
  agentSettings?: AgentSettings
) => {
  const cacheKey = hashText(
    JSON.stringify({
      modelConfig: modelConfig ?? {},
      agentSettings: agentSettings ?? {},
    })
  );
  const cached = agentCache.get(cacheKey);
  if (cached) return cached;

  const baseURL = modelConfig?.baseURL || DEFAULT_BASE_URL;
  const middleware = buildMiddleware(baseURL, agentSettings);

  const agent = createAgent({
    model: getModel(modelConfig),
    tools: [recallSpecificTool, recallEntityTool],
    contextSchema,
    checkpointer,
    middleware,
  });
  agentCache.set(cacheKey, agent);
  return agent;
};

// Add conversation memories to vector store
export const addConversationMemory = async (
  conversationId: string,
  content: string,
  metadata: Record<string, unknown> = {}
) => {
  await vectorStore.addText(content, {
    ...metadata,
    conversationId,
    timestamp: new Date().toISOString(),
    type: 'conversation_memory',
  });
};

// Extract model configuration from generation settings
const extractModelConfig = (
  settings?: GenerationSettings
): ModelConfig | undefined => {
  if (!settings) return undefined;

  const {
    enableAssociativeMemory: _enableAssociativeMemory,
    enableSummaryMemory: _enableSummaryMemory,
    enableConstitutionMiddleware: _enableConstitutionMiddleware,
    enableAppealProcess: _enableAppealProcess,
    ...modelConfig
  } = settings;

  return Object.keys(modelConfig).length > 0 ? modelConfig : undefined;
};

// Extract agent settings from generation settings
const extractAgentSettings = (
  settings?: GenerationSettings
): AgentSettings | undefined => {
  if (!settings) return undefined;

  const agentSettings: AgentSettings = {};
  if (settings.enableAssociativeMemory !== undefined) {
    agentSettings.enableAssociativeMemory = settings.enableAssociativeMemory;
  }
  if (settings.enableSummaryMemory !== undefined) {
    agentSettings.enableSummaryMemory = settings.enableSummaryMemory;
  }
  if (settings.enableConstitutionMiddleware !== undefined) {
    agentSettings.enableConstitutionMiddleware =
      settings.enableConstitutionMiddleware;
  }
  if (settings.enableAppealProcess !== undefined) {
    agentSettings.enableAppealProcess = settings.enableAppealProcess;
  }

  return Object.keys(agentSettings).length > 0 ? agentSettings : undefined;
};

const VALID_ROLES = ['user', 'assistant', 'system'] as const;
type ValidRole = (typeof VALID_ROLES)[number];

function toValidRole(role: unknown): ValidRole {
  if (typeof role === 'string' && VALID_ROLES.includes(role as ValidRole)) {
    return role as ValidRole;
  }
  return 'user';
}

// Normalize messages for agent invocation: ensure every message has a valid role and content
const normalizeMessages = (
  messages: Array<{ role?: string; content?: string }>
): Array<{ role: string; content: string }> => {
  const filtered = messages
    .filter((msg) => msg != null && typeof msg === 'object')
    .map((msg) => ({
      role: toValidRole(msg.role),
      content: typeof msg.content === 'string' ? msg.content : '',
    }));

  if (filtered.length === 0) {
    return [];
  }

  const isLikelyFirstMessage = filtered.length === 1;
  if (isLikelyFirstMessage) {
    return filtered;
  }

  const latestMessage = filtered[filtered.length - 1];
  return [
    {
      role: latestMessage.role,
      content: latestMessage.content,
    },
  ];
};

// Invoke agent with proper context and checkpointer config.
// Uses agent.stream() (not streamEvents) so middleware state is initialized and the stream completes.
export const invokeAgent = async (
  messages: Array<{ role?: string; content?: string }>,
  conversationId: string = 'default',
  generationSettings?: GenerationSettings
) => {
  const normalized = normalizeMessages(messages);
  if (normalized.length === 0) {
    logger.warn('invokeAgent called with no valid messages');
    throw new Error('No valid messages to process');
  }

  logger.info(
    'Invoke: conversationId=%s normalizedCount=%s',
    conversationId,
    normalized.length
  );
  for (let i = 0; i < normalized.length; i++) {
    const m = normalized[i];
    const preview =
      m.content.length > 80 ? m.content.slice(0, 80) + '...' : m.content;
    logger.debug('  message[%s] role=%s content=%s', i, m.role, preview);
  }

  const modelConfig = extractModelConfig(generationSettings);
  const baseURL = modelConfig?.baseURL || DEFAULT_BASE_URL;
  const normalizedBase = baseURL.trim().replace(/\/+$/, '');
  if (normalizedBase === ZEN_BASE_URL.replace(/\/+$/, '')) {
    const zenKey = getConfig().ai.zenApiKey;
    if (zenKey) {
      modelConfig!.apiKey = zenKey;
    }
  }
  const agentSettings = extractAgentSettings(generationSettings);
  const agent = initializeInterlocutor(modelConfig, agentSettings);

  if (!agent) {
    logger.error('Failed to initialize agent');
    throw new Error('Failed to initialize agent');
  }

  logger.debug('Streaming for conversationId=%s', conversationId);
  // Use ['values', 'messages'] to emit both state updates and streaming message chunks
  // This format is required by @ai-sdk/langchain's toUIMessageStream adapter
  return await agent.stream(
    { messages: normalized },
    {
      configurable: { thread_id: conversationId },
      context: { conversationId },
      streamMode: ['values', 'messages'],
    }
  );
};
