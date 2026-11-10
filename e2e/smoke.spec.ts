import { expect } from '@playwright/test';
import { test } from './fixture';

test.describe('Midscene e2e (NVIDIA NIM)', () => {
  test('smoke: page title and basic AI assertion', async ({
    page,
    aiAssert,
  }) => {
    await page.goto('https://example.com');
    await expect(page).toHaveTitle(/Example Domain/);
    await aiAssert('The page shows the heading "Example Domain"');
  });
});
