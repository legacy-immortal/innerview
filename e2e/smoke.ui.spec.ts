import { expect, test } from './ui.fixture';
import { formatViolations } from './perf';

test.describe('UI/perf (non-agentic)', () => {
  test('smoke: load, console clean, and within performance budgets', async ({
    page,
    instrumentation,
  }, testInfo) => {
    await page.goto('https://example.com', { waitUntil: 'load' });
    await expect(page).toHaveTitle(/Example Domain/);

    const metrics = await instrumentation.collectMetrics();

    // Attach metrics eagerly for visibility even on pass.
    await testInfo.attach('performance-metrics-summary', {
      body: JSON.stringify(
        {
          navigation: metrics.navigation,
          cdp: {
            ScriptDuration: metrics.cdp.ScriptDuration,
            TaskDuration: metrics.cdp.TaskDuration,
            LayoutCount: metrics.cdp.LayoutCount,
            RecalcStyleCount: metrics.cdp.RecalcStyleCount,
            JSHeapUsedSize: metrics.cdp.JSHeapUsedSize,
          },
          budgets: metrics.budgets,
          violations: metrics.violations,
        },
        null,
        2
      ),
      contentType: 'application/json',
    });

    expect(
      metrics.violations,
      `Performance/quality budget violations: ${formatViolations(metrics)}`
    ).toEqual([]);
  });
});
