import type { CDPSession, Page, TestInfo } from '@playwright/test';

export interface ConsoleEntry {
  type: string;
  text: string;
  location?: string;
  timestamp: number;
}

export interface PerfBudgets {
  maxLoadMs: number;
  maxDclMs: number;
  maxResponseMs: number;
  maxScriptDurationMs: number;
  maxTaskDurationMs: number;
  maxLayoutCount: number;
  maxConsoleErrors: number;
  maxPageErrors: number;
}

export interface PerfMetrics {
  url: string;
  navigation: Record<string, number | string | boolean | null>;
  cdp: Record<string, number>;
  budgets: PerfBudgets;
  violations: string[];
  consoleErrorCount: number;
  pageErrorCount: number;
  collectedAt: string;
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function envNum(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function getPerfBudgets(): PerfBudgets {
  return {
    maxLoadMs: envNum('E2E_PERF_MAX_LOAD_MS', 5000),
    maxDclMs: envNum('E2E_PERF_MAX_DCL_MS', 3000),
    maxResponseMs: envNum('E2E_PERF_MAX_RESPONSE_MS', 1500),
    maxScriptDurationMs: envNum('E2E_PERF_MAX_SCRIPT_DURATION_MS', 2000),
    maxTaskDurationMs: envNum('E2E_PERF_MAX_TASK_DURATION_MS', 4000),
    maxLayoutCount: envNum('E2E_PERF_MAX_LAYOUT_COUNT', 500),
    maxConsoleErrors: envNum('E2E_PERF_MAX_CONSOLE_ERRORS', 0),
    maxPageErrors: envNum('E2E_PERF_MAX_PAGE_ERRORS', 0),
  };
}

export interface InstrumentationHandle {
  consoleLogs: ConsoleEntry[];
  pageErrors: string[];
  attach: (testInfo: TestInfo) => Promise<void>;
  dispose: () => Promise<void>;
  collectMetrics: () => Promise<PerfMetrics>;
}

export async function instrumentPage(page: Page): Promise<InstrumentationHandle> {
  const consoleLogs: ConsoleEntry[] = [];
  const pageErrors: string[] = [];
  let cdp: CDPSession | null = null;

  page.on('console', (msg) => {
    const loc = msg.location();
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      location: loc?.url ? `${loc.url}:${loc.lineNumber}:${loc.columnNumber}` : undefined,
      timestamp: Date.now(),
    });
  });

  page.on('pageerror', (err) => {
    pageErrors.push(String(err?.stack || err));
  });

  try {
    cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
  } catch {
    cdp = null;
  }

  async function collectMetrics(): Promise<PerfMetrics> {
    const budgets = getPerfBudgets();

    const navigation = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined;
      const paint = performance.getEntriesByType('paint');
      const fcp = paint.find((e) => e.name === 'first-contentful-paint');
      if (!nav) {
        return { available: false, url: location.href } as Record<
          string,
          number | string | boolean | null
        >;
      }
      return {
        available: true,
        url: location.href,
        durationMs: nav.duration,
        responseMs: nav.responseEnd - nav.requestStart,
        domContentLoadedMs: nav.domContentLoadedEventEnd - nav.startTime,
        loadMs: nav.loadEventEnd - nav.startTime,
        transferSize: nav.transferSize,
        encodedBodySize: nav.encodedBodySize,
        decodedBodySize: nav.decodedBodySize,
        domInteractiveMs: nav.domInteractive - nav.startTime,
        fcpMs: fcp ? fcp.startTime : null,
      } as Record<string, number | string | boolean | null>;
    });

    const cdpMetrics: Record<string, number> = {};
    if (cdp) {
      try {
        const { metrics } = await cdp.send('Performance.getMetrics');
        for (const m of metrics) {
          cdpMetrics[m.name] = m.value;
        }
      } catch {
        // ignore CDP metric collection failures
      }
    }

    const consoleErrorCount = consoleLogs.filter((l) => l.type === 'error').length;
    const pageErrorCount = pageErrors.length;

    const violations: string[] = [];
    const nav = navigation as Record<string, unknown>;
    const loadMs = num(nav.loadMs);
    const dclMs = num(nav.domContentLoadedMs);
    const responseMs = num(nav.responseMs);
    const scriptMs = num(cdpMetrics.ScriptDuration) * 1000;
    const taskMs = num(cdpMetrics.TaskDuration) * 1000;
    const layoutCount = num(cdpMetrics.LayoutCount);

    if (loadMs > 0 && loadMs > budgets.maxLoadMs) {
      violations.push(`loadMs ${loadMs.toFixed(1)} > ${budgets.maxLoadMs}`);
    }
    if (dclMs > 0 && dclMs > budgets.maxDclMs) {
      violations.push(`domContentLoadedMs ${dclMs.toFixed(1)} > ${budgets.maxDclMs}`);
    }
    if (responseMs > 0 && responseMs > budgets.maxResponseMs) {
      violations.push(`responseMs ${responseMs.toFixed(1)} > ${budgets.maxResponseMs}`);
    }
    if (scriptMs > budgets.maxScriptDurationMs) {
      violations.push(`scriptDurationMs ${scriptMs.toFixed(1)} > ${budgets.maxScriptDurationMs}`);
    }
    if (taskMs > budgets.maxTaskDurationMs) {
      violations.push(`taskDurationMs ${taskMs.toFixed(1)} > ${budgets.maxTaskDurationMs}`);
    }
    if (layoutCount > budgets.maxLayoutCount) {
      violations.push(`layoutCount ${layoutCount} > ${budgets.maxLayoutCount}`);
    }
    if (consoleErrorCount > budgets.maxConsoleErrors) {
      violations.push(`consoleErrors ${consoleErrorCount} > ${budgets.maxConsoleErrors}`);
    }
    if (pageErrorCount > budgets.maxPageErrors) {
      violations.push(`pageErrors ${pageErrorCount} > ${budgets.maxPageErrors}`);
    }

    return {
      url: String(nav.url ?? page.url()),
      navigation,
      cdp: cdpMetrics,
      budgets,
      violations,
      consoleErrorCount,
      pageErrorCount,
      collectedAt: new Date().toISOString(),
    };
  }

  async function attach(testInfo: TestInfo): Promise<void> {
    await testInfo.attach('console-logs', {
      body: JSON.stringify(consoleLogs, null, 2),
      contentType: 'application/json',
    });
    await testInfo.attach('page-errors', {
      body: JSON.stringify(pageErrors, null, 2),
      contentType: 'application/json',
    });
    const metrics = await collectMetrics();
    await testInfo.attach('performance-metrics', {
      body: JSON.stringify(metrics, null, 2),
      contentType: 'application/json',
    });
    if (metrics.violations.length > 0 || testInfo.status !== testInfo.expectedStatus) {
      console.log('[e2e-perf] metrics:', JSON.stringify(metrics, null, 2));
      if (consoleLogs.length) console.log('[e2e-console]', JSON.stringify(consoleLogs, null, 2));
      if (pageErrors.length) console.log('[e2e-page-errors]', JSON.stringify(pageErrors, null, 2));
    }
  }

  async function dispose(): Promise<void> {
    if (cdp) {
      try {
        await cdp.detach();
      } catch {
        // ignore
      }
    }
  }

  return { consoleLogs, pageErrors, attach, dispose, collectMetrics };
}

export function formatViolations(metrics: PerfMetrics): string {
  return metrics.violations.join('; ');
}
