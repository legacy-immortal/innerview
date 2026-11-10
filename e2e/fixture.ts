import { test as base } from '@playwright/test';
import {
  PlaywrightAiFixture,
  type PlayWrightAiFixtureType,
} from '@midscene/web/playwright';

/**
 * Midscene AI fixture for e2e tests (NVIDIA NIM / OpenAI-compatible VLLM).
 * Import `test` from this file and `expect` from `@playwright/test`.
 */
export const test = base.extend<PlayWrightAiFixtureType>(
  PlaywrightAiFixture({
    waitForNetworkIdleTimeout: 2_000,
  })
);
