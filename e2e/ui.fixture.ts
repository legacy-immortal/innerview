import { test as base, expect } from '@playwright/test';
import { instrumentPage, type InstrumentationHandle } from './perf';

type UiFixtures = {
  instrumentation: InstrumentationHandle;
};

export const test = base.extend<UiFixtures>({
  instrumentation: async ({ page }, provide, testInfo) => {
    const handle = await instrumentPage(page);
    await provide(handle);
    try {
      await handle.attach(testInfo);
    } finally {
      await handle.dispose();
    }
  },
});

export { expect };
