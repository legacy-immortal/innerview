/**
 * @file GET /api/status — backend load snapshot for the frontend indicator.
 * @module routes/status
 */
import { Hono } from 'hono';
import { statusTracker, type ModelStatus } from '../services/status-tracker.js';
import { transcriptionService } from '../services/transcription-service.js';

const app = new Hono();

app.get('/api/status', (c) => {
  const transcription = transcriptionService.getStatus();
  const extraModels: ModelStatus[] = [
    {
      name: 'transcription',
      loading: transcription.loading,
      ready: transcription.ready,
      failed: transcription.failed,
      error: transcription.error,
    },
    {
      name: 'chat',
      loading: statusTracker.getModelLoading('chat'),
    },
  ];
  return c.json(statusTracker.getSnapshot(extraModels));
});

export default app;
