#!/usr/bin/env bun
/**
 * Containerized local deployment (Docker Compose API service).
 * - Frees required host port(s) before launch
 * - Starts docker compose (build by default unless --no-build)
 * - Ensures teardown/cleanup on exit (Ctrl-C/SIGINT, SIGTERM, SIGHUP, SIGQUIT):
 *   runs `docker compose down --remove-orphans` and clears ports to avoid
 *   orphaned containers/processes.
 */
import { spawn, type Subprocess } from 'bun';
import { existsSync } from 'node:fs';

const args = process.argv.slice(2);
const noBuild = args.includes('--no-build');
const detach = args.includes('-d') || args.includes('--detach');
const PORT = Number(process.env.PORT || 3002);

function run(cmd: string[], opts: { cwd?: string } = {}) {
  return spawn(cmd, {
    cwd: opts.cwd ?? process.cwd(),
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  });
}

async function runWait(cmd: string[]): Promise<number> {
  const proc = run(cmd);
  return await proc.exited;
}

async function killPorts(): Promise<void> {
  if (!Number.isFinite(PORT) || PORT <= 0) return;
  const code = await runWait(['bun', 'scripts/kill-ports.ts', '--port', String(PORT)]);
  if (code !== 0) {
    console.warn(`[dev-docker] kill-ports exited with code ${code}`);
  }
}

let cleaning = false;
let child: Subprocess | null = null;

async function dockerDown(): Promise<void> {
  // Best-effort teardown; ignore errors if compose project not running.
  const code = await runWait(['sudo', 'docker', 'compose', 'down', '--remove-orphans']);
  if (code !== 0) {
    console.warn(`[dev-docker] docker compose down exited with code ${code}`);
  }
}

async function cleanup(reason: string, exitCode = 0): Promise<void> {
  if (cleaning) return;
  cleaning = true;
  console.log(`\n[dev-docker] Teardown (${reason})...`);

  if (child) {
    try {
      child.kill('SIGTERM');
    } catch {}
    await Bun.sleep(800);
    try {
      child.kill('SIGKILL');
    } catch {}
  }

  try {
    await dockerDown();
  } catch (e) {
    console.warn('[dev-docker] docker down warning:', e);
  }
  try {
    await killPorts();
  } catch (e) {
    console.warn('[dev-docker] port cleanup warning:', e);
  }

  console.log('[dev-docker] Cleanup complete.');
  process.exit(exitCode);
}

for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGQUIT'] as const) {
  process.on(sig, () => {
    void cleanup(sig, sig === 'SIGINT' ? 130 : 143);
  });
}

process.on('uncaughtException', (err) => {
  console.error('[dev-docker] Uncaught exception:', err);
  void cleanup('uncaughtException', 1);
});
process.on('unhandledRejection', (err) => {
  console.error('[dev-docker] Unhandled rejection:', err);
  void cleanup('unhandledRejection', 1);
});

async function main() {
  if (!existsSync('docker-compose.yml')) {
    console.error('[dev-docker] docker-compose.yml not found in current directory.');
    process.exit(1);
  }

  console.log(`[dev-docker] Preparing containerized local deployment (port: ${PORT})...`);
  await killPorts();

  const upArgs = ['sudo', 'docker', 'compose', 'up'];
  if (!noBuild) upArgs.push('--build');
  if (detach) upArgs.push('-d');

  child = spawn(upArgs, {
    cwd: process.cwd(),
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  });

  const code = await child.exited;
  child = null;

  if (detach) {
    // Detached mode: leave running, but still ensure we report status clearly.
    if (code === 0) {
      console.log('[dev-docker] Containers started in detached mode.');
      console.log('[dev-docker] Use `bun run docker:down` (or `sudo docker compose down --remove-orphans`) to teardown and clear ports.');
      process.exit(0);
    }
    await cleanup(`exit:${code}`, code ?? 1);
    return;
  }

  if (!cleaning) {
    // Foreground up exited (Ctrl-C handled via signal, but be defensive)
    await cleanup(`exit:${code}`, code ?? 0);
  }
}

main().catch((err) => {
  console.error('[dev-docker] Fatal:', err);
  void cleanup('fatal', 1);
});
