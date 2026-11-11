#!/usr/bin/env bun
/**
 * Render.com diagnostics helper for Innerview deployments.
 *
 * Usage:
 *   bun scripts/render-diagnostics.ts [command] [options]
 *
 * Commands:
 *   services                      List services in the account/owner scope
 *   service                       Show details for one service
 *   deploys                       List recent deploys for a service
 *   events                        List recent events for a service
 *   logs                          Fetch logs (deploy logs by default when deploy id provided)
 *   summary                       Service + recent deploys + recent events (default)
 *
 * Options:
 *   --service-id <id|name>        Service id (srv-...) or exact service name
 *   --deploy-id <id>              Deploy id (dep-...) for logs command
 *   --limit <n>                   Max items to fetch (default: 10)
 *   --json                        Print raw JSON output
 *   --help                        Show help
 *
 * Env:
 *   RENDER_API_KEY                Required Render API key
 *   RENDER_SERVICE_ID             Default service id/name
 *   RENDER_OWNER_ID               Optional owner filter for listing services
 */

type Json = Record<string, unknown>;

const RENDER_API_BASE = 'https://api.render.com/v1';

interface CliOptions {
  command: string;
  serviceId?: string;
  deployId?: string;
  limit: number;
  json: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    command: 'summary',
    limit: 10,
    json: false,
    help: false,
  };
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg === '--json') {
      opts.json = true;
    } else if (arg === '--service-id') {
      opts.serviceId = argv[++i];
    } else if (arg === '--deploy-id') {
      opts.deployId = argv[++i];
    } else if (arg === '--limit') {
      const n = Number(argv[++i]);
      if (Number.isFinite(n) && n > 0) opts.limit = Math.floor(n);
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }
  if (positional[0]) opts.command = positional[0];
  opts.serviceId =
    opts.serviceId || process.env.RENDER_SERVICE_ID || process.env.RENDER_SERVICE;
  return opts;
}

function usage(): string {
  return `Render diagnostics for Innerview

Usage:
  bun scripts/render-diagnostics.ts [summary|services|service|deploys|events|logs] [options]

Options:
  --service-id <id|name>   Service id (srv-...) or exact service name
  --deploy-id <id>         Deploy id (dep-...) for deploy logs
  --limit <n>              Max items (default 10)
  --json                   Print raw JSON
  --help                   Show this help

Environment:
  RENDER_API_KEY           Required
  RENDER_SERVICE_ID        Default service id/name
  RENDER_OWNER_ID          Optional owner id filter for service listing
`;
}

function getApiKey(): string {
  const key = process.env.RENDER_API_KEY?.trim();
  if (!key) {
    throw new Error(
      'RENDER_API_KEY is required. Set it in your environment (do not commit secrets).'
    );
  }
  return key;
}

async function apiRequest<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = path.startsWith('http') ? path : `${RENDER_API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // keep raw text
  }
  if (!res.ok) {
    const detail =
      typeof data === 'object' && data !== null
        ? JSON.stringify(data)
        : String(data);
    throw new Error(`Render API ${res.status} ${res.statusText}: ${detail}`);
  }
  return data as T;
}

function unwrapList<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (item && typeof item === 'object' && 'cursor' in (item as Json)) {
        const obj = item as Json;
        for (const key of Object.keys(obj)) {
          if (key !== 'cursor') return obj[key] as T;
        }
      }
      return item as T;
    });
  }
  return [];
}

function print(data: unknown, asJson: boolean): void {
  if (asJson) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  console.log(JSON.stringify(data, null, 2));
}

async function listServices(limit: number): Promise<Json[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const ownerId = process.env.RENDER_OWNER_ID?.trim();
  if (ownerId) params.set('ownerId', ownerId);
  const data = await apiRequest<unknown>(`/services?${params.toString()}`);
  return unwrapList<Json>(data);
}

async function resolveServiceId(serviceIdOrName?: string): Promise<string> {
  if (!serviceIdOrName) {
    throw new Error(
      'Service is required. Pass --service-id <srv-...|name> or set RENDER_SERVICE_ID.'
    );
  }
  if (serviceIdOrName.startsWith('srv-')) return serviceIdOrName;
  const services = await listServices(100);
  const match = services.find((s) => {
    const service = (s.service as Json | undefined) || s;
    const name = String(service.name || '');
    const id = String(service.id || '');
    return name === serviceIdOrName || id === serviceIdOrName;
  });
  if (!match) {
    throw new Error(
      `Could not find service "${serviceIdOrName}". Use --service-id srv-... or an exact service name.`
    );
  }
  const service = (match.service as Json | undefined) || match;
  return String(service.id);
}

async function getService(serviceId: string): Promise<Json> {
  return apiRequest<Json>(`/services/${encodeURIComponent(serviceId)}`);
}

async function listDeploys(serviceId: string, limit: number): Promise<Json[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const data = await apiRequest<unknown>(
    `/services/${encodeURIComponent(serviceId)}/deploys?${params.toString()}`
  );
  return unwrapList<Json>(data);
}

async function listEvents(serviceId: string, limit: number): Promise<Json[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const data = await apiRequest<unknown>(
    `/services/${encodeURIComponent(serviceId)}/events?${params.toString()}`
  );
  return unwrapList<Json>(data);
}

async function fetchLogs(
  serviceId: string,
  deployId?: string,
  limit = 100
): Promise<unknown> {
  // Render log APIs vary by account/features; try common endpoints best-effort.
  const attempts: string[] = [];
  if (deployId) {
    attempts.push(`/deploys/${encodeURIComponent(deployId)}/logs?limit=${limit}`);
    attempts.push(
      `/services/${encodeURIComponent(serviceId)}/deploys/${encodeURIComponent(deployId)}/logs?limit=${limit}`
    );
  }
  attempts.push(
    `/logs?resource=${encodeURIComponent(serviceId)}&limit=${limit}`
  );
  attempts.push(
    `/services/${encodeURIComponent(serviceId)}/logs?limit=${limit}`
  );

  const errors: string[] = [];
  for (const path of attempts) {
    try {
      return await apiRequest<unknown>(path);
    } catch (err) {
      errors.push(`${path}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(
    `Unable to fetch logs from known endpoints. Attempts:\n- ${errors.join('\n- ')}\n\nTip: use Render dashboard/CLI log streaming for live logs if your API plan does not expose log retrieval.`
  );
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(usage());
    return;
  }

  const command = opts.command.toLowerCase();
  try {
    if (command === 'services') {
      const services = await listServices(opts.limit);
      print(services, opts.json);
      return;
    }

    const serviceId = await resolveServiceId(opts.serviceId);

    if (command === 'service') {
      print(await getService(serviceId), opts.json);
      return;
    }
    if (command === 'deploys') {
      print(await listDeploys(serviceId, opts.limit), opts.json);
      return;
    }
    if (command === 'events') {
      print(await listEvents(serviceId, opts.limit), opts.json);
      return;
    }
    if (command === 'logs') {
      print(await fetchLogs(serviceId, opts.deployId, opts.limit), opts.json);
      return;
    }

    // summary (default)
    const [service, deploys, events] = await Promise.all([
      getService(serviceId),
      listDeploys(serviceId, opts.limit).catch((e) => ({ error: String(e) })),
      listEvents(serviceId, opts.limit).catch((e) => ({ error: String(e) })),
    ]);
    print({ serviceId, service, deploys, events }, opts.json);
  } catch (err) {
    console.error(
      `[render-diagnostics] ${err instanceof Error ? err.message : String(err)}`
    );
    process.exit(1);
  }
}

void main();
