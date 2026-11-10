// Backend transcription routes
// Uses TranscriptionService for speech-to-text conversion

import { Hono } from 'hono';
import { createLogger } from '../logger.js';
import { transcriptionService } from '../services/transcription-service.js';

const app = new Hono();

const logger = createLogger('Transcription');

// Transcription endpoint for backend transcription
app.post('/api/transcription', async (c) => {
  try {
    const formData = await c.req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return c.json({ error: 'No audio file provided' }, 400);
    }

    const language = formData.get('language') as string | null;

    // Transcribe the audio file
    const result = await transcriptionService.transcribeFile(audioFile, {
      language: language || undefined,
    });

    return c.json({
      text: result.text,
      segments: result.segments,
      language: result.language,
      duration: result.duration,
    });
  } catch (error) {
    logger.error(
      'Transcription error: %s',
      error instanceof Error ? error.message : String(error)
    );
    return c.json(
      {
        error: 'Transcription failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// Model status endpoint - check if transcription model is ready
app.get('/api/transcription/status', (c) => {
  const status = transcriptionService.getStatus();
  return c.json(status);
});

// Endpoint to trigger model preload without transcribing
// Preserved API: blocks until loaded/failed, same response shapes as before
// (progress added additively). Detailed per-file progress is pollable via
// GET /api/transcription/status or streamed via the preload SSE endpoint.
app.post('/api/transcription/preload', async (c) => {
  try {
    const status = transcriptionService.getStatus();

    if (status.ready) {
      return c.json({
        status: 'already_loaded',
        modelId: transcriptionService.getModelId(),
        progress: status.progress,
      });
    }

    if (status.failed) {
      // Reset failure state to allow retry
      transcriptionService.resetError();
    }

    await transcriptionService.preload();

    return c.json({
      status: 'loaded',
      modelId: transcriptionService.getModelId(),
      progress: transcriptionService.getProgress(),
    });
  } catch (error) {
    return c.json(
      {
        status: 'failed',
        modelId: transcriptionService.getModelId(),
        error: error instanceof Error ? error.message : 'Unknown error',
        progress: transcriptionService.getProgress(),
      },
      500
    );
  }
});

// Detailed preload progress as Server-Sent Events. Starts the preload in the
// background (idempotent — shares the same in-flight promise as the POST
// endpoint) and streams status snapshots until ready/failed, then closes.
// Existing clients that poll /api/transcription/status are unaffected.
app.get('/api/transcription/preload/stream', (c) => {
  const encoder = new TextEncoder();
  const send = (
    controller: ReadableStreamDefaultController<Uint8Array>,
    payload: unknown
  ): void => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const initial = transcriptionService.getStatus();
        if (initial.failed) transcriptionService.resetError();
        if (!initial.ready) {
          // Fire-and-forget: the stream polls status below; errors surface
          // as a `failed` snapshot rather than an unhandled rejection.
          transcriptionService.preload().catch(() => undefined);
        }
        for (;;) {
          const status = transcriptionService.getStatus();
          send(controller, status);
          if (status.ready || status.failed) {
            send(controller, { done: true, status });
            controller.close();
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      } catch (error) {
        try {
          send(controller, {
            done: true,
            status: transcriptionService.getStatus(),
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        } finally {
          controller.close();
        }
      }
    },
  });

  return c.body(stream, 200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
});

export default app;
