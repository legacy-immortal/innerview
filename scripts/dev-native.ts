#!/usr/bin/env bun
/**
 * Native local deployment (Vite client + Bun API server).
 * - Frees required ports before launch
 * - Runs frontend/backend together
 * - Ensures teardown/cleanup on exit (Ctrl-C/SIGINT, SIGTERM, SIGHUP, SIGQUIT):
 *   stops child processes, clears ports, and avoids orphaned processes.
 */
import { spawn, type Subprocess } from 'bun';

const PORTS = [5173, 3002];

function run(cmd: string[], opts: { cwd?: string; inherit?: boolean } = {}) {
  const proc = spawn(cmd, {
    cwd: opts.cwd ?? process.cwd(),
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  });
  return proc;
}

async function runWait(cmd: string[]): Promise<number> {
  const proc = run(cmd);
  return await proc.exited;
}

async function killPorts(): Promise<void> {
  const code = await runWait(['bun', 'scripts/kill-ports.ts', ...PORTS.flatMap((p) => ['--port', String(p)])]);
  if (code !== 0) {
    console.warn(`[dev-native] kill-ports exited with code ${code}`);
  }
}

let cleaning = false;
let children: Subprocess[] = [];

async function cleanup(reason: string, exitCode = 0): Promise<void> {
  if (cleaning) return;
  cleaning = true;
  console.log(`\n[dev-native] Teardown (${reason})...`);

  for (const child of children) {
    try {
      child.kill('SIGTERM');
    } catch {}
  }
  // Give children a moment to exit gracefully, then force kill and clear ports.
  await Bun.sleep(800);
  for (const child of children) {
    try {
      child.kill('SIGKILL');
    } catch {}
  }

  try {
    await killPorts();
  } catch (e) {
    console.warn('[dev-native] port cleanup warning:', e);
  }

  console.log('[dev-native] Cleanup complete.');
  process.exit(exitCode);
}

for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGQUIT'] as const) {
  process.on(sig, () => {
    void cleanup(sig, sig === 'SIGINT' ? 130 : 143);
  });
}

process.on('uncaughtException', (err) => {
  console.error('[dev-native] Uncaught exception:', err);
  void cleanup('uncaughtException', 1);
});
process.on('unhandledRejection', (err) => {
  console.error('[dev-native] Unhandled rejection:', err);
  void cleanup('unhandledRejection', 1);
});

async function main() {
  console.log('[dev-native] Preparing local native deployment (ports: 5173, 3002)...');

  const preCheck = await runWait(['bun', 'scripts/check-resources.ts']);
  if (preCheck !== 0) {
    console.error(`[dev-native] Resource check failed (exit ${preCheck}). Aborting.`);
    process.exit(preCheck);
  }

  const preKill = await runWait(['bun', 'scripts/kill-ports.ts', '--port', '5173,3002']);
  if (preKill !== 0) {
    console.warn(`[dev-native] pre-launch kill-ports exited with code ${preKill}`);
  }

  // Start via concurrently so output is labeled; we manage lifecycle/cleanup here.
  const child = spawn(
    [
      'bunx',
      'concurrently',
      '-n',
      'frontend,backend',
      '-c',
      'cyan,magenta',
      '--kill-others-on-fail',
      'bun run dev:client',
      'bun run dev:server',
    ],
    {
      cwd: process.cwd(),
      stdin: 'inherit',
      stdout: 'inherit',
      stderr: 'inherit',
    }
  );
  children = [child];

  const code = await child.exited;
  if (!cleaning) {
    // Normal/abnormal exit: still ensure ports are cleared.
    await cleanup(`exit:${code}`, code ?? 0);
  }
}

main().catch((err) => {
  console.error('[dev-native] Fatal:', err);
  void cleanup('fatal', 1);
});
