import { toUIMessageStream } from '@ai-sdk/langchain';
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { truncate } from 'es-toolkit/compat';
import { Hono } from 'hono';
import {
  checkProviderAvailability,
  invokeAgent,
  ZEN_BASE_URL,
} from '../agents/index.js';
import { getConfig } from '../config/index.js';
import { logChat as logger } from '../logger.js';
import { statusTracker } from '../services/status-tracker.js';
import { throttleReadableStream } from '../utils/streaming.js';

const app = new Hono();

/** Extract plain text from a message that may have content as string or AI SDK parts array. */
function getMessageText(msg: { content?: unknown; parts?: unknown }): string {
  if (msg == null) return '';
  const c = msg.content;
  if (typeof c === 'string') return c.trim();
  if (Array.isArray(c)) {
    const text = c
      .filter(
        (p): p is { type?: string; text?: string } =>
          p != null && typeof p === 'object'
      )
      .map((p) => (typeof p.text === 'string' ? p.text : ''))
      .join(' ')
      .trim();
    if (text) return text;
  }
  const parts = msg.parts;
  if (Array.isArray(parts)) {
    return parts
      .filter(
        (p): p is { type?: string; text?: string } =>
          p != null && typeof p === 'object'
      )
      .map((p) => (typeof p.text === 'string' ? p.text : ''))
      .join(' ')
      .trim();
  }
  return '';
}

// Streaming endpoint using AI SDK data stream protocol
app.post('/api/chat', async (c) => {
  try {
    const { messages, conversationId, generationSettings } = await c.req.json();
    const cid = conversationId ?? 'default';
    const msgCount = Array.isArray(messages) ? messages.length : 0;
    const latestContent =
      Array.isArray(messages) && messages.length > 0
        ? truncate(getMessageText(messages[messages.length - 1] ?? {}), {
            length: 120,
          })
        : '';

    logger.info(
      'Request: conversationId=%s messageCount=%s latestPreview=%s',
      cid,
      msgCount,
      latestContent || '(empty)'
    );

    // Extract the latest user message (also used by MOCK_LLM dev path).
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage || latestMessage.role !== 'user') {
      logger.warn(
        'Rejected: invalid message format (latest role=%s)',
        latestMessage?.role
      );
      return c.json({ error: 'Invalid message format' }, 400);
    }
    const userContent = getMessageText(latestMessage);
    if (!userContent) {
      logger.warn('Rejected: empty user message');
      return c.json({ error: 'Message content cannot be empty' }, 400);
    }

    // Dev/test mock: short-circuit before provider checks so UI can be
    // click-tested without an upstream LLM or local provider running.
    if (process.env.MOCK_LLM === '1') {
      logger.info('MOCK_LLM: returning canned response');
      const textId = `mock-text-${Date.now()}`;
      const mockStream = createUIMessageStream({
        execute: ({ writer }) => {
          writer.write({ type: 'text-start', id: textId });
          writer.write({
            type: 'text-delta',
            id: textId,
            delta: `Mock response (MOCK_LLM=1). You said: ${userContent.slice(0, 200)}`,
          });
          writer.write({ type: 'text-end', id: textId });
        },
      });
      return createUIMessageStreamResponse({ stream: mockStream });
    }

    // Resolve API key: Zen uses ZEN_API_KEY from env; others use client-provided key
    const baseURL = generationSettings?.baseURL?.trim().replace(/\/+$/, '');
    const isZen = baseURL === ZEN_BASE_URL.replace(/\/+$/, '');
    const effectiveApiKey = isZen
      ? getConfig().ai.zenApiKey
      : generationSettings?.apiKey;

    const providerStatus = await checkProviderAvailability(
      generationSettings?.baseURL,
      effectiveApiKey
    );

    if (!providerStatus.available) {
      return c.json(
        {
          error: 'AI provider unavailable',
          code: 'PROVIDER_UNAVAILABLE',
          details: providerStatus.error,
          suggestion: providerStatus.suggestion,
        },
        503
      );
    }

    const requestMessages = Array.isArray(messages) ? messages : [];
    const normalizedForAgent = requestMessages.map(
      (m: { role?: string; content?: unknown; parts?: unknown }) => ({
        role: m?.role ?? 'user',
        content: getMessageText(m ?? {}),
      })
    );
    // Avoid serializing the full conversation into logs on every turn.
    logger.info('Normalized for agent: count=%s', normalizedForAgent.length);
    statusTracker.setModelLoading('chat', true);
    let stream: Awaited<ReturnType<typeof invokeAgent>>;
    try {
      stream = await invokeAgent(normalizedForAgent, cid, generationSettings);
    } finally {
      statusTracker.setModelLoading('chat', false);
    }
    const rawUiStream = toUIMessageStream(stream) as Parameters<
      typeof createUIMessageStreamResponse
    >[0]['stream'];
    // Throttle/coalesce bursty token chunks before they hit the socket.
    const uiStream = throttleReadableStream(
      rawUiStream as unknown as ReadableStream<Uint8Array>
    ) as unknown as typeof rawUiStream;
    return createUIMessageStreamResponse({ stream: uiStream });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Route error: %s', message);

    // Upstream LLM returned 503/502 (e.g. provider overloaded or down)
    const is503 =
      /503\s+status\s+code|503\s+error|status\s+503/i.test(message) ||
      (error as { status?: number }).status === 503;
    const is502 =
      /502\s+status\s+code|502\s+error|status\s+502/i.test(message) ||
      (error as { status?: number }).status === 502;
    if (is503 || is502) {
      return c.json(
        {
          error: 'AI provider temporarily unavailable',
          code: 'PROVIDER_UNAVAILABLE',
          details: message,
          suggestion:
            'The model server may be overloaded or restarting. Try again in a moment.',
        },
        503
      );
    }

    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
