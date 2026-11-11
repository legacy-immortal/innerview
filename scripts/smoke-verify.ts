#!/usr/bin/env bun
/**
 * Smoke/deploy verification for Innerview targets.
 *
 * Checks:
 *   1. GET  <api>/health
 *   2. GET  <api>/api/provider/status
 *   3. OPTIONS preflight from Pages origin to API (CORS)
 *
 * Usage:
 *   bun scripts/smoke-verify.ts [options]
 *
 * Options:
 *   --api-base <url>       API base URL (default: https://innerview.onrender.com)
 *   --pages-origin <url>   Pages/web origin for CORS preflight (default: https://innerview.pages.dev)
 *   --help                 Show help
 *
 * Env:
 *   API_BASE               Default API base URL
 *   PAGES_ORIGIN           Default Pages origin
 */

interface CliOptions {
  apiBase: string;
  pagesOrigin: string;
  help: boolean;
}

interface CheckResult {
  name: string;
  ok: boolean;
  status?: number;
  evidence: string[];
  error?: string;
}

const DEFAULT_API_BASE = 'https://innerview.onrender.com';
const DEFAULT_PAGES_ORIGIN = 'https://innerview.pages.dev';
const TIMEOUT_MS = 15_000;

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    apiBase:
      process.env.API_BASE?.trim() ||
      process.env.SMOKE_API_BASE?.trim() ||
      DEFAULT_API_BASE,
    pagesOrigin:
      process.env.PAGES_ORIGIN?.trim() ||
      process.env.SMOKE_PAGES_ORIGIN?.trim() ||
      DEFAULT_PAGES_ORIGIN,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg === '--api-base') {
      opts.apiBase = argv[++i] ?? opts.apiBase;
    } else if (arg.startsWith('--api-base=')) {
      opts.apiBase = arg.slice('--api-base='.length) || opts.apiBase;
    } else if (arg === '--pages-origin') {
      opts.pagesOrigin = argv[++i] ?? opts.pagesOrigin;
    } else if (arg.startsWith('--pages-origin=')) {
      opts.pagesOrigin = arg.slice('--pages-origin='.length) || opts.pagesOrigin;
    }
  }

  return opts;
}

function usage(): string {
  return `Innerview deploy smoke verification

Usage:
  bun scripts/smoke-verify.ts [--api-base <url>] [--pages-origin <url>]

Options:
  --api-base <url>       API base URL (default: ${DEFAULT_API_BASE})
  --pages-origin <url>   Pages/web origin for CORS preflight (default: ${DEFAULT_PAGES_ORIGIN})
  --help                 Show this help

Environment:
  API_BASE               Default API base URL
  PAGES_ORIGIN           Default Pages origin

Checks:
  - GET /health
  - GET /api/provider/status
  - OPTIONS CORS preflight from Pages origin to API
`;
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

async function fetchWithTimeout(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text.slice(0, 200);
  }
}

function printResult(result: CheckResult): void {
  const icon = result.ok ? 'PASS' : 'FAIL';
  console.log(`\n[${icon}] ${result.name}`);
  if (typeof result.status === 'number') {
    console.log(`  status: ${result.status}`);
  }
  for (const line of result.evidence) {
    console.log(`  ${line}`);
  }
  if (result.error) {
    console.log(`  error: ${result.error}`);
  }
}

async function checkHealth(apiBase: string): Promise<CheckResult> {
  const url = `${apiBase}/health`;
  try {
    const res = await fetchWithTimeout(url, { method: 'GET' });
    const body = (await safeJson(res)) as Record<string, unknown> | null;
    const okFlag = body && typeof body === 'object' ? body.ok === true : false;
    const statusField = body && typeof body === 'object' ? body.status : undefined;
    const ok = res.status >= 200 && res.status < 300 && (okFlag || statusField === 'ok');

    const evidence = [`url: ${url}`];
    if (body && typeof body === 'object') {
      if ('ok' in body) evidence.push(`body.ok: ${String(body.ok)}`);
      if ('status' in body) evidence.push(`body.status: ${String(body.status)}`);
      if ('timestamp' in body) evidence.push('body.timestamp: present');
    } else if (body != null) {
      evidence.push(`body: ${String(body)}`);
    }

    return {
      name: 'GET /health',
      ok,
      status: res.status,
      evidence,
      error: ok ? undefined : 'Expected 2xx with health ok/status indicator',
    };
  } catch (err) {
    return {
      name: 'GET /health',
      ok: false,
      evidence: [`url: ${url}`],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkProviderStatus(apiBase: string): Promise<CheckResult> {
  const url = `${apiBase}/api/provider/status`;
  try {
    const res = await fetchWithTimeout(url, { method: 'GET' });
    const body = (await safeJson(res)) as Record<string, unknown> | null;
    const ok = res.status >= 200 && res.status < 300;

    const evidence = [`url: ${url}`];
    if (body && typeof body === 'object') {
      if ('available' in body) evidence.push(`available: ${String(body.available)}`);
      if ('provider' in body) evidence.push(`provider: ${String(body.provider)}`);
      if ('baseURL' in body) evidence.push(`baseURL: ${String(body.baseURL)}`);
      if ('embeddingModel' in body) {
        evidence.push(`embeddingModel: ${String(body.embeddingModel)}`);
      }
      if ('chatModel' in body) evidence.push(`chatModel: ${String(body.chatModel)}`);
      if ('error' in body && body.error) {
        evidence.push(`error: ${String(body.error)}`);
      }
    } else if (body != null) {
      evidence.push(`body: ${String(body)}`);
    }

    return {
      name: 'GET /api/provider/status',
      ok,
      status: res.status,
      evidence,
      error: ok ? undefined : 'Expected 2xx response',
    };
  } catch (err) {
    return {
      name: 'GET /api/provider/status',
      ok: false,
      evidence: [`url: ${url}`],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkCorsPreflight(
  apiBase: string,
  pagesOrigin: string
): Promise<CheckResult> {
  const target = `${apiBase}/api/provider/status`;
  const evidence = [
    `preflight: OPTIONS ${target}`,
    `origin: ${pagesOrigin}`,
    'access-control-request-method: GET',
    'access-control-request-headers: content-type',
  ];

  try {
    const res = await fetchWithTimeout(target, {
      method: 'OPTIONS',
      headers: {
        Origin: pagesOrigin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'content-type',
      },
    });

    const allowOrigin = res.headers.get('access-control-allow-origin');
    const allowMethods = res.headers.get('access-control-allow-methods');
    const allowHeaders = res.headers.get('access-control-allow-headers');
    const vary = res.headers.get('vary');

    if (allowOrigin) evidence.push(`access-control-allow-origin: ${allowOrigin}`);
    if (allowMethods) evidence.push(`access-control-allow-methods: ${allowMethods}`);
    if (allowHeaders) evidence.push(`access-control-allow-headers: ${allowHeaders}`);
    if (vary) evidence.push(`vary: ${vary}`);

    const statusOk = res.status === 200 || res.status === 204;
    const originOk =
      allowOrigin === pagesOrigin || allowOrigin === '*' || allowOrigin === pagesOrigin + '/';
    const ok = statusOk && originOk;

    let error: string | undefined;
    if (!statusOk) {
      error = 'Expected preflight status 200 or 204';
    } else if (!originOk) {
      error = `Expected Access-Control-Allow-Origin to allow ${pagesOrigin}`;
    }

    return {
      name: 'CORS preflight (Pages origin -> API)',
      ok,
      status: res.status,
      evidence,
      error,
    };
  } catch (err) {
    return {
      name: 'CORS preflight (Pages origin -> API)',
      ok: false,
      evidence,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(usage());
    return;
  }

  const apiBase = normalizeBaseUrl(opts.apiBase);
  const pagesOrigin = normalizeBaseUrl(opts.pagesOrigin);

  console.log('Innerview deploy smoke verification');
  console.log(`apiBase: ${apiBase}`);
  console.log(`pagesOrigin: ${pagesOrigin}`);

  const results: CheckResult[] = [];
  results.push(await checkHealth(apiBase));
  results.push(await checkProviderStatus(apiBase));
  results.push(await checkCorsPreflight(apiBase, pagesOrigin));

  for (const result of results) printResult(result);

  const failed = results.filter((r) => !r.ok);
  console.log('');
  if (failed.length === 0) {
    console.log(`Summary: PASS (${results.length}/${results.length} checks)`);
    process.exit(0);
  } else {
    console.log(
      `Summary: FAIL (${results.length - failed.length}/${results.length} checks passed)`
    );
    process.exit(1);
  }
}

void main().catch((err) => {
  console.error(
    `[smoke-verify] ${err instanceof Error ? err.message : String(err)}`
  );
  process.exit(1);
});
