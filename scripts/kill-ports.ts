import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const DEFAULT_PORTS = [5173, 3002];
const PIDS_TO_SKIP = new Set([0, 4]);

function parsePorts(argv: string[]): number[] {
  const ports: number[] = [];
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--port' || arg === '-p') {
      const next = argv[i + 1];
      if (!next) {
        console.error('Error: --port requires a value');
        process.exit(1);
      }
      i++;
      for (const part of next.split(',')) {
        const num = parseInt(part.trim(), 10);
        if (isNaN(num) || num <= 0 || num > 65535) {
          console.error(`Error: invalid port "${part.trim()}"`);
          process.exit(1);
        }
        ports.push(num);
      }
    } else if (arg.startsWith('--port=') || arg.startsWith('-p=')) {
      const value = arg.split('=')[1];
      for (const part of value.split(',')) {
        const num = parseInt(part.trim(), 10);
        if (isNaN(num) || num <= 0 || num > 65535) {
          console.error(`Error: invalid port "${part.trim()}"`);
          process.exit(1);
        }
        ports.push(num);
      }
    }
  }
  return ports.length > 0 ? ports : DEFAULT_PORTS;
}

async function shell(cmd: string): Promise<string> {
  const { stdout } = await execAsync(cmd, {
    shell: true,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout;
}

function isWindows(): boolean {
  return process.platform === 'win32';
}

async function pidsOnPortWindows(port: number): Promise<number[]> {
  const out = await shell(`netstat -ano | findstr :${port}`);
  const pids: number[] = [];
  for (const line of out.split('\n')) {
    if (!line.toUpperCase().includes('LISTENING')) continue;
    const parts = line.trim().split(/\s+/);
    const pid = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(pid) && !PIDS_TO_SKIP.has(pid)) {
      pids.push(pid);
    }
  }
  return pids;
}

async function pidsOnPortUnix(port: number): Promise<number[]> {
  // Prefer lsof: it prints PIDs directly with -t
  try {
    const out = await shell(`lsof -iTCP:${port} -sTCP:LISTEN -tP 2>/dev/null`);
    const pids: number[] = [];
    for (const line of out.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const pid = parseInt(trimmed, 10);
      if (!isNaN(pid) && !PIDS_TO_SKIP.has(pid)) {
        pids.push(pid);
      }
    }
    if (pids.length > 0) return pids;
  } catch {
    // fall through to ss
  }

  // Fallback to ss: parse users:(("name",pid=1234,fd=...))
  const out = await shell(`ss -ltnp 2>/dev/null | grep ":${port} " || true`);
  const pids: number[] = [];
  for (const line of out.split('\n')) {
    const match = line.match(/pid=(\d+)/);
    if (match) {
      const pid = parseInt(match[1], 10);
      if (!PIDS_TO_SKIP.has(pid)) {
        pids.push(pid);
      }
    }
  }
  return pids;
}

async function getPidsOnPort(port: number): Promise<number[]> {
  return isWindows() ? pidsOnPortWindows(port) : pidsOnPortUnix(port);
}

async function killPid(pid: number): Promise<boolean> {
  try {
    if (isWindows()) {
      await shell(`taskkill /PID ${pid} /F`);
    } else {
      process.kill(pid, 'SIGKILL');
    }
    return true;
  } catch {
    return false;
  }
}

async function processName(pid: number): Promise<string> {
  try {
    if (isWindows()) {
      const { stdout } = await execAsync(
        `tasklist /FI "PID eq ${pid}" /FO CSV /NH`,
        { shell: true, maxBuffer: 10 * 1024 * 1024 }
      );
      const match = stdout.match(/"([^"]+)"/);
      return match ? match[1] : 'unknown';
    }
    const { stdout } = await execAsync(`ps -p ${pid} -o comm=`, {
      shell: true,
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout.trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}

async function main() {
  const killed: string[] = [];
  const ports = parsePorts(process.argv);

  for (const port of ports) {
    const pids = await getPidsOnPort(port);

    if (pids.length === 0) {
      console.log(`○ Port ${port} is free`);
      continue;
    }

    for (const pid of pids) {
      const name = await processName(pid);
      const ok = await killPid(pid);
      if (ok) {
        console.log(`✓ Killed process on port ${port} (PID ${pid}: ${name})`);
        killed.push(`Port ${port} (PID ${pid}): ${name}`);
      } else {
        console.log(`⚠ Failed to kill PID ${pid} on port ${port}`);
      }
    }
  }

  if (killed.length > 0) {
    console.log(
      `\nSummary: Freed ${killed.length} port(s). Waiting 2s for OS to release...`
    );
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } else {
    console.log('\nAll ports are available');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
