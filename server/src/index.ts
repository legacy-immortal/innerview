import { serve } from '@hono/node-server';
import { config } from './config/index.js';
import { createApp } from './create-app.js';

// Initialize config (validates environment variables on startup)
try {
  void config.all; // Access to trigger validation
} catch (error) {
  console.error('Configuration error:', error);
  process.exit(1);
}

const app = createApp();

serve(
  {
    fetch: app.fetch,
    port: config.server.port,
  },
  (info) => {
    console.log(`Server is running on port ${info.port}`);
    console.log(`Environment: ${config.server.nodeEnv}`);
    console.log(`CORS origin: ${config.server.corsOrigin}`);
  }
);
