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
app.post('/api/transcription/preload', async (c) => {
  try {
    const status = transcriptionService.getStatus();

    if (status.ready) {
      return c.json({
        status: 'already_loaded',
        modelId: transcriptionService.getModelId(),
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
    });
  } catch (error) {
    return c.json(
      {
        status: 'failed',
        modelId: transcriptionService.getModelId(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default app;
