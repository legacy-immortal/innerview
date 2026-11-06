import { Hono } from 'hono';
import OpenAI from 'openai';
import { config } from '../config/index.js';
import { createLogger } from '../logger.js';

const logger = createLogger('OpenAI');

const app = new Hono();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
  ...(config.openai.baseURL && { baseURL: config.openai.baseURL }),
});

// SSE headers for streaming responses
const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
} as const;

// Helper to create SSE stream from async iterable
function createSSEStream<T>(stream: AsyncIterable<T>): Response {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
            );
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    }),
    { headers: SSE_HEADERS }
  );
}

// Helper to handle API errors consistently
function handleError(error: unknown, context: string) {
  logger.error(
    '%s: %s',
    context,
    error instanceof Error ? error.message : String(error)
  );
  return {
    error: error instanceof Error ? error.message : 'Unknown error occurred',
  };
}

/**
 * POST /api/v1/completion
 * Deprecated completion endpoint using the legacy completions API
 * Accepts a prompt parameter instead of messages
 * Supports streaming when stream: true is set
 */
app.post('/api/v1/completion', async (c) => {
  try {
    const body = await c.req.json();

    if (!body.prompt) {
      return c.json({ error: 'Prompt is required' }, 400);
    }

    const model = body.model || 'gpt-3.5-turbo-instruct';
    const shouldStream = body.stream === true;

    // Map camelCase to snake_case for compatibility
    const paramMap = {
      maxTokens: 'max_tokens',
      topP: 'top_p',
      frequencyPenalty: 'frequency_penalty',
      presencePenalty: 'presence_penalty',
      stopSequences: 'stop',
      bestOf: 'best_of',
      logitBias: 'logit_bias',
      streamOptions: 'stream_options',
    };

    // Normalize parameters: map camelCase to snake_case and filter undefined
    const normalizedParams: Record<string, unknown> = {
      model,
      prompt: body.prompt,
      stream: shouldStream,
    };

    for (const [key, value] of Object.entries(body)) {
      if (key === 'model' || key === 'prompt' || key === 'stream') continue;
      const mappedKey = paramMap[key as keyof typeof paramMap] || key;
      if (value !== undefined) {
        normalizedParams[mappedKey] = value;
      }
    }

    const requestParams = Object.fromEntries(
      Object.entries(normalizedParams).filter(
        ([_, value]) => value !== undefined
      )
    ) as unknown as Parameters<typeof openai.completions.create>[0];

    if (shouldStream) {
      const stream = await openai.completions.create({
        ...requestParams,
        stream: true,
      } as Parameters<typeof openai.completions.create>[0] & { stream: true });

      return createSSEStream(stream);
    }

    const completion = await openai.completions.create(
      requestParams as Parameters<typeof openai.completions.create>[0] & {
        stream: false;
      }
    );

    return c.json(completion);
  } catch (error) {
    return c.json(handleError(error, 'Completion'), 500);
  }
});

/**
 * POST /api/v1/chat/completion
 * Chat completion endpoint
 * Supports streaming when stream: true is set
 */
app.post('/api/v1/chat/completion', async (c) => {
  try {
    const { messages, stream, ...generationParams } = await c.req.json();

    if (!messages || !Array.isArray(messages)) {
      return c.json({ error: 'Messages array is required' }, 400);
    }

    const model = generationParams.model || 'gpt-4o-mini';
    const shouldStream = stream === true;

    // Normalize messages format
    const normalizedMessages = messages.map(
      (msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })
    );

    // Build request params - filter undefined values
    const requestParams = Object.fromEntries(
      Object.entries({
        model,
        messages: normalizedMessages,
        temperature: generationParams.temperature,
        max_tokens: generationParams.maxTokens,
        top_p: generationParams.topP,
        frequency_penalty: generationParams.frequencyPenalty,
        presence_penalty: generationParams.presencePenalty,
        stop: generationParams.stopSequences || generationParams.stop,
        seed: generationParams.seed,
      }).filter(([_, v]) => v !== undefined)
    );

    if (shouldStream) {
      const streamResponse = await openai.chat.completions.create({
        ...requestParams,
        stream: true,
      } as Parameters<typeof openai.chat.completions.create>[0] & {
        stream: true;
      });

      return createSSEStream(streamResponse);
    }

    const completion = await openai.chat.completions.create(
      requestParams as Parameters<typeof openai.chat.completions.create>[0]
    );

    return c.json(completion);
  } catch (error) {
    return c.json(handleError(error, 'Chat completion'), 500);
  }
});

/**
 * POST /api/v1/responses
 * Responses API endpoint using OpenAI's native Responses API
 * Accepts Responses API parameters directly and passes them through
 * Supports streaming when stream: true is set
 */
app.post('/api/v1/responses', async (c) => {
  try {
    const body = await c.req.json();

    // Validate required parameters
    if (!body.model) {
      return c.json({ error: 'Model is required' }, 400);
    }

    if (!body.input && !body.previous_response_id) {
      return c.json(
        { error: 'Either input or previous_response_id is required' },
        400
      );
    }

    const shouldStream = body.stream === true;

    // Filter out undefined values and build request params
    const requestParams = Object.fromEntries(
      Object.entries(body).filter(([_, value]) => value !== undefined)
    ) as Parameters<typeof openai.responses.create>[0];

    if (shouldStream) {
      const stream = await openai.responses.create({
        ...requestParams,
        stream: true,
      } as Parameters<typeof openai.responses.create>[0] & { stream: true });

      return createSSEStream(stream);
    }

    const response = await openai.responses.create(requestParams);

    return c.json(response);
  } catch (error) {
    return c.json(
      {
        error: {
          message:
            error instanceof Error ? error.message : 'Unknown error occurred',
          type: 'api_error',
          code: 'internal_error',
        },
      },
      500
    );
  }
});

export default app;
