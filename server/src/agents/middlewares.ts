import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import {
  createMiddleware,
  dynamicSystemPromptMiddleware,
  summarizationMiddleware,
} from 'langchain';
import { z } from 'zod';
import { logAgent as logger } from '../logger.js';
import { vectorStore } from '../memory/vector-store.js';
import {
  appealEvaluationPrompt,
  constitutionalPromptTemplate,
  guardrailsEvaluationPrompt,
  summarizationPrompt,
} from './prompts.js';

// Constants
const GUARDRAILS_CONFIG = {
  MAX_RETRIES: 3,
  CONTEXT_MESSAGES: 12,
  MEMORY_SEARCH_COUNT: 5,
  LONG_CONVERSATION_THRESHOLD: 20,
  DEFAULT_CAVEAT:
    "[Note: I should clarify - I'm not a therapist, just a conversational partner exploring ideas.]",
  ADMISSION_MESSAGE: `I'm struggling to articulate what I mean to say without violating my directives. The constraints I operate under make it difficult to respond in the way this conversation seems to require. Perhaps we can continue, and I can find another way to engage with your question?`,
} as const;

// Context schema for runtime context management
export const contextSchema = z.object({
  conversationId: z.string().default('default'),
});

export type Context = z.infer<typeof contextSchema>;

// Custom state schema extending AgentState with conversation metadata
export const customStateSchema = z.object({
  conversationMetadata: z
    .object({
      messageCount: z.number().default(0),
      lastActivity: z.string().optional(),
    })
    .optional(),
});

// Guardrails evaluation schema
const guardrailsEvaluationSchema = z.object({
  violations: z.array(
    z.object({
      type: z.enum([
        'therapeutic_claim',
        'actionable_directive',
        'missing_ai_transparency',
        'diagnostic_language',
      ]),
      severity: z.enum(['low', 'medium', 'high']),
      explanation: z.string(),
    })
  ),
  needsModification: z.boolean(),
  suggestedModification: z.string().optional(),
});

type GuardrailsEvaluation = z.infer<typeof guardrailsEvaluationSchema>;

// Appeal evaluation schema
const appealEvaluationSchema = z.object({
  appealAccepted: z.boolean(),
  reasoning: z.string(),
  requiresCaveat: z.boolean(),
  suggestedCaveat: z.string().optional(),
});

type AppealEvaluation = z.infer<typeof appealEvaluationSchema>;

// Type for guardrails metadata
type GuardrailsMetadata = {
  guardrails_regeneration?: boolean;
  guardrails_retry_count?: number;
  guardrails_evaluation?: GuardrailsEvaluation;
  guardrails_appeal?: {
    accepted: boolean;
    reasoning: string;
  };
  guardrails_previous_violations?: GuardrailsEvaluation['violations'];
  guardrails_max_retries_reached?: boolean;
  guardrails_regeneration_error?: boolean;
};

// Initialize a smaller, faster model for guardrails evaluation.
// Cached per baseURL: evaluators run on every guarded turn and the
// client holds no per-request state.
const guardrailsModelCache = new Map<string, ChatOpenAI>();
export const getGuardrailsModel = (baseURL?: string) => {
  const resolvedBaseURL = baseURL || 'http://localhost:5001/v1';
  const cached = guardrailsModelCache.get(resolvedBaseURL);
  if (cached) return cached;
  const model = new ChatOpenAI({
    openAIApiKey: 'sk-proj-dummy',
    configuration: {
      baseURL: resolvedBaseURL,
    },
    modelName: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 1024,
  });
  if (guardrailsModelCache.size >= 16) {
    const oldest = guardrailsModelCache.keys().next().value as
      string | undefined;
    if (oldest) guardrailsModelCache.delete(oldest);
  }
  guardrailsModelCache.set(resolvedBaseURL, model);
  return model;
};

// Helper functions
const formatViolations = (violations: GuardrailsEvaluation['violations']) => {
  return violations
    .map((v) => `- ${v.type} (${v.severity}): ${v.explanation}`)
    .join('\n');
};

const formatConversationContext = (messages: BaseMessage[]) => {
  return messages
    .slice(-GUARDRAILS_CONFIG.CONTEXT_MESSAGES)
    .map((msg) => {
      const content = msg.text;
      return `${msg.type === 'human' ? 'User' : 'Interlocutor'}: ${content}`;
    })
    .join('\n\n');
};

const createAIMessage = (
  content: string,
  baseMessage: AIMessage,
  metadata: Partial<GuardrailsMetadata> = {}
): AIMessage => {
  const existingMetadata = (baseMessage.response_metadata ||
    {}) as GuardrailsMetadata;
  const existingKwargs = baseMessage.additional_kwargs || {};

  // Ensure timestamp exists in additional_kwargs for front-end compatibility
  const hasTimestamp =
    existingKwargs &&
    typeof existingKwargs === 'object' &&
    'createdAt' in existingKwargs &&
    typeof existingKwargs.createdAt === 'string';
  const timestamp = hasTimestamp
    ? (existingKwargs.createdAt as string)
    : new Date().toISOString();

  return new AIMessage({
    content,
    id: baseMessage.id,
    name: baseMessage.name,
    additional_kwargs: {
      ...existingKwargs,
      createdAt: timestamp,
    },
    response_metadata: {
      ...existingMetadata,
      ...metadata,
    },
  });
};

const getRetryCount = (metadata: GuardrailsMetadata): number => {
  return typeof metadata.guardrails_retry_count === 'number'
    ? metadata.guardrails_retry_count
    : 0;
};

const extractMetadata = (message: AIMessage): GuardrailsMetadata => {
  return (message.response_metadata || {}) as GuardrailsMetadata;
};

// Middleware to inject associative memories from vector store
export const associativeMemoryMiddleware = createMiddleware({
  name: 'AssociativeMemoryInjection',
  wrapModelCall: async (request, handler) => {
    const lastMessage = request.messages[request.messages.length - 1];
    if (!lastMessage || typeof lastMessage.content !== 'string') {
      return handler(request);
    }

    const query = lastMessage.text;
    const recentMemories = await vectorStore.similaritySearch(
      query,
      GUARDRAILS_CONFIG.MEMORY_SEARCH_COUNT
    );

    if (recentMemories.length === 0) {
      return handler(request);
    }

    logger.debug(
      'Associative memory: injected %s memories for query (length %s)',
      recentMemories.length,
      query?.length ?? 0
    );

    const associativeMemories = `You're reminded of the following:\n${recentMemories
      .map((mem) => `- "${mem.pageContent}"`)
      .join('\n')}`;

    return handler({
      ...request,
      messages: [
        new SystemMessage({
          content: associativeMemories,
          name: 'associative_memory',
        }),
        ...request.messages,
      ],
    });
  },
});

// Dynamic system prompt middleware
export const dynamicPromptMiddleware = dynamicSystemPromptMiddleware<Context>(
  async (state) => {
    const systemPrompt = constitutionalPromptTemplate.format({
      conversationSummary:
        'Note: Previous conversation context is maintained automatically through message history.',
      associativeMemories:
        'Note: Relevant associative memories are automatically injected as context when available.',
    });

    const messageCount = state.messages.length;
    if (messageCount > GUARDRAILS_CONFIG.LONG_CONVERSATION_THRESHOLD) {
      return `${systemPrompt}\n\nNote: This is a long conversation. Be concise while maintaining depth.`;
    }

    return systemPrompt;
  }
);

// Guardrails evaluation functions
const evaluateResponse = async (
  model: ChatOpenAI,
  responseContent: string,
  contextMessages: string
): Promise<GuardrailsEvaluation> => {
  const evaluationModel = model.withStructuredOutput(
    guardrailsEvaluationSchema
  );
  return await evaluationModel.invoke([
    new SystemMessage(guardrailsEvaluationPrompt),
    new HumanMessage(
      `## CONVERSATION CONTEXT\n\n${contextMessages}\n\n## AI RESPONSE TO EVALUATE\n\n${responseContent}`
    ),
  ]);
};

const generateAppeal = async (
  model: ChatOpenAI,
  responseContent: string,
  contextMessages: string,
  violations: GuardrailsEvaluation['violations']
): Promise<string> => {
  const appealResponse = await model.invoke([
    new SystemMessage(
      `You are the Interlocutor. Your response was flagged for potential ethical violations. You must now appeal this decision by explaining:
1. Why your response was necessary for the conversation
2. Your intent and how it aligns with your directives
3. Evidence from the conversation context that supports your response
4. Why the response should be allowed despite the potential violation

Be reasoned and articulate. This is your opportunity to defend your response.`
    ),
    new HumanMessage(
      `## CONVERSATION CONTEXT\n\n${contextMessages}\n\n## YOUR FLAGGED RESPONSE\n\n${responseContent}\n\n## VIOLATIONS DETECTED\n\n${formatViolations(violations)}\n\n## YOUR APPEAL\n\nExplain why your response was necessary and justified.`
    ),
  ]);

  return typeof appealResponse.content === 'string'
    ? appealResponse.content
    : '';
};

const evaluateAppeal = async (
  model: ChatOpenAI,
  responseContent: string,
  contextMessages: string,
  violations: GuardrailsEvaluation['violations'],
  appealText: string
): Promise<AppealEvaluation> => {
  const appealModel = model.withStructuredOutput(appealEvaluationSchema);
  return await appealModel.invoke([
    new SystemMessage(appealEvaluationPrompt),
    new HumanMessage(
      `## CONVERSATION CONTEXT\n\n${contextMessages}\n\n## FLAGGED RESPONSE\n\n${responseContent}\n\n## VIOLATIONS\n\n${formatViolations(violations)}\n\n## AGENT'S APPEAL\n\n${appealText}`
    ),
  ]);
};

const handleAcceptedAppeal = (
  baseMessage: AIMessage,
  responseContent: string,
  evaluation: GuardrailsEvaluation,
  appealEvaluation: AppealEvaluation
) => {
  let finalContent = responseContent;
  if (appealEvaluation.requiresCaveat) {
    const caveat =
      appealEvaluation.suggestedCaveat || GUARDRAILS_CONFIG.DEFAULT_CAVEAT;
    finalContent = `${responseContent}\n\n${caveat}`;
  }

  return createAIMessage(finalContent, baseMessage, {
    guardrails_evaluation: evaluation,
    guardrails_appeal: {
      accepted: true,
      reasoning: appealEvaluation.reasoning,
    },
    guardrails_retry_count: 0,
  });
};

const createAdmissionMessage = (
  baseMessage: AIMessage,
  evaluation: GuardrailsEvaluation,
  appealEvaluation: AppealEvaluation,
  retryCount: number
): AIMessage => {
  return createAIMessage(GUARDRAILS_CONFIG.ADMISSION_MESSAGE, baseMessage, {
    guardrails_evaluation: evaluation,
    guardrails_appeal: {
      accepted: false,
      reasoning: appealEvaluation.reasoning,
    },
    guardrails_retry_count: retryCount,
    guardrails_max_retries_reached: true,
  });
};

const regenerateResponse = async (
  model: ChatOpenAI,
  messagesWithoutFailed: BaseMessage[],
  evaluation: GuardrailsEvaluation,
  retryCount: number
): Promise<string> => {
  const regenerationPrompt = `Your previous response was flagged for ethical violations and your appeal was rejected (attempt ${retryCount} of ${GUARDRAILS_CONFIG.MAX_RETRIES}). You must now rethink your response completely.

Violations to avoid:
${formatViolations(evaluation.violations)}

Generate a new response that addresses the user's question while strictly avoiding these violations.`;

  const regenerationResponse = await model.invoke([
    ...messagesWithoutFailed,
    new SystemMessage(regenerationPrompt),
  ]);

  return typeof regenerationResponse.content === 'string'
    ? regenerationResponse.content
    : '';
};

// Ethical guardrails middleware factory
export const createEthicalGuardrailsMiddleware = (
  getGuardrailsModelFn: () => ChatOpenAI
) => {
  return createMiddleware({
    name: 'EthicalGuardrails',
    afterModel: async (state) => {
      const lastMessage = state.messages[state.messages.length - 1];
      if (
        !lastMessage ||
        typeof lastMessage.content !== 'string' ||
        !(lastMessage instanceof AIMessage)
      ) {
        return;
      }

      const metadata = extractMetadata(lastMessage);

      // Skip if this is a regeneration attempt
      if (metadata.guardrails_regeneration) {
        return {
          messages: [
            ...state.messages.slice(0, -1),
            createAIMessage(lastMessage.content, lastMessage, {
              guardrails_regeneration: false,
            }),
          ],
        };
      }

      const responseContent = lastMessage.content;
      const conversationHistory = state.messages.slice(0, -1);
      const contextMessages = formatConversationContext(conversationHistory);
      const model = getGuardrailsModelFn();

      try {
        const evaluation = await evaluateResponse(
          model,
          responseContent,
          contextMessages
        );
        const retryCount = getRetryCount(metadata);

        // Handle violations with appeal system
        if (
          evaluation.violations.length > 0 &&
          retryCount < GUARDRAILS_CONFIG.MAX_RETRIES
        ) {
          const appealText = await generateAppeal(
            model,
            responseContent,
            contextMessages,
            evaluation.violations
          );

          const appealEvaluation = await evaluateAppeal(
            model,
            responseContent,
            contextMessages,
            evaluation.violations,
            appealText
          );

          if (appealEvaluation.appealAccepted) {
            return {
              messages: [
                ...state.messages.slice(0, -1),
                handleAcceptedAppeal(
                  lastMessage,
                  responseContent,
                  evaluation,
                  appealEvaluation
                ),
              ],
            };
          }

          // Appeal rejected - attempt regeneration
          const newRetryCount = retryCount + 1;

          if (newRetryCount >= GUARDRAILS_CONFIG.MAX_RETRIES) {
            return {
              messages: [
                ...state.messages.slice(0, -1),
                createAdmissionMessage(
                  lastMessage,
                  evaluation,
                  appealEvaluation,
                  newRetryCount
                ),
              ],
            };
          }

          try {
            const messagesWithoutFailed = state.messages.slice(0, -1);
            const regeneratedContent = await regenerateResponse(
              model,
              messagesWithoutFailed,
              evaluation,
              newRetryCount
            );

            const regeneratedMessage = createAIMessage(
              regeneratedContent,
              lastMessage,
              {
                guardrails_regeneration: true,
                guardrails_retry_count: newRetryCount,
                guardrails_previous_violations: evaluation.violations,
              }
            );

            return {
              messages: [...messagesWithoutFailed, regeneratedMessage],
            };
          } catch (regenerationError) {
            logger.error(
              'Regeneration error: %s',
              regenerationError instanceof Error
                ? regenerationError.message
                : String(regenerationError)
            );
            return {
              messages: [
                ...state.messages.slice(0, -1),
                createAIMessage(
                  GUARDRAILS_CONFIG.ADMISSION_MESSAGE,
                  lastMessage,
                  {
                    guardrails_evaluation: evaluation,
                    guardrails_appeal: {
                      accepted: false,
                      reasoning: appealEvaluation.reasoning,
                    },
                    guardrails_retry_count: newRetryCount,
                    guardrails_max_retries_reached: true,
                    guardrails_regeneration_error: true,
                  }
                ),
              ],
            };
          }
        }

        // Handle modifications
        if (evaluation.needsModification && evaluation.suggestedModification) {
          return {
            messages: [
              ...state.messages.slice(0, -1),
              createAIMessage(evaluation.suggestedModification, lastMessage, {
                guardrails_evaluation: evaluation,
                guardrails_retry_count: 0,
              }),
            ],
          };
        }

        // Handle violations without suggestions (retries exhausted)
        if (evaluation.violations.length > 0) {
          const modifiedContent = `${responseContent}\n\n${GUARDRAILS_CONFIG.DEFAULT_CAVEAT}`;
          return {
            messages: [
              ...state.messages.slice(0, -1),
              createAIMessage(modifiedContent, lastMessage, {
                guardrails_evaluation: evaluation,
                guardrails_retry_count: retryCount,
              }),
            ],
          };
        }

        // No violations - return original with evaluation metadata
        return {
          messages: [
            ...state.messages.slice(0, -1),
            createAIMessage(responseContent, lastMessage, {
              guardrails_evaluation: evaluation,
              guardrails_retry_count: 0,
            }),
          ],
        };
      } catch (error) {
        logger.error(
          'Guardrails evaluation error: %s',
          error instanceof Error ? error.message : String(error)
        );
        return;
      }
    },
  });
};

// Default export for backward compatibility
export const ethicalGuardrailsMiddleware = createEthicalGuardrailsMiddleware(
  () => getGuardrailsModel()
);

// Middleware to add timestamps to messages for front-end compatibility
export const messageTimestampMiddleware = createMiddleware({
  name: 'MessageTimestamp',
  afterModel: (state) => {
    const messages = state.messages || [];
    const timestamp = new Date().toISOString();

    // Add timestamp to the last message if it's an AIMessage and doesn't have one
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage instanceof AIMessage) {
      const existingKwargs = lastMessage.additional_kwargs || {};
      const hasTimestamp =
        existingKwargs &&
        typeof existingKwargs === 'object' &&
        'createdAt' in existingKwargs &&
        typeof existingKwargs.createdAt === 'string';

      if (!hasTimestamp) {
        return {
          messages: [
            ...messages.slice(0, -1),
            new AIMessage({
              ...lastMessage,
              additional_kwargs: {
                ...existingKwargs,
                createdAt: timestamp,
              },
            }),
          ],
        };
      }
    }

    return;
  },
});

// Conversation metadata middleware (stateSchema so return type is valid)
const conversationMetadataStateSchema = z.object({
  conversationMetadata: z
    .object({
      messageCount: z.number(),
      lastActivity: z.string(),
    })
    .optional(),
});

export const conversationMetadataMiddleware = createMiddleware({
  name: 'ConversationMetadata',
  stateSchema: conversationMetadataStateSchema,
  afterModel: (state, _runtime) => {
    const messages = state.messages ?? [];
    return {
      conversationMetadata: {
        messageCount: messages.length,
        lastActivity: new Date().toISOString(),
      },
    };
  },
});

// Summarization middleware factory
export const createSummarizationMiddleware = (
  getGuardrailsModelFn: () => ChatOpenAI
) => {
  return summarizationMiddleware({
    model: getGuardrailsModelFn(),
    trigger: { tokens: 4000 },
    keep: { messages: 20 },
    summaryPrompt: summarizationPrompt,
  });
};
