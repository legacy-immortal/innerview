/**
 * @file terminalSystemInfo.ts — terminal session state and banner generation.
 *
 * Holds the module-level terminal session flags (`globalWelcomeShown`,
 * `currentMode`) and generates the fake Ubuntu login banner shown when the
 * terminal layout first mounts. Module state is mutated only through the
 * `set*`/`reset*` functions so callers never reach into the internals.
 *
 * @module components/chat/terminal/terminalSystemInfo
 */

import type { TerminalMode } from './terminalTypes';

/** Whether the welcome banner has already been shown in this session. */
export let globalWelcomeShown = false;

/** Currently active terminal mode, or `null` before first entry. */
export let currentMode: TerminalMode | null = null;

/**
 * Marks the welcome banner as shown (or resets the flag).
 *
 * @param value New flag value.
 */
export const setGlobalWelcomeShown = (value: boolean): void => {
  globalWelcomeShown = value;
};

/**
 * Sets the currently active terminal mode.
 *
 * @param mode Mode to store, or `null` to clear.
 */
export const setCurrentMode = (mode: TerminalMode | null): void => {
  currentMode = mode;
};

/**
 * Clears the welcome banner when leaving the filesystem view so it shows
 * again on the next entry.
 *
 * @param mode Mode being entered.
 */
export const resetWelcomeIfLeavingFilesystem = (mode: TerminalMode): void => {
  if (currentMode === 'filesystem' && mode !== 'filesystem') {
    globalWelcomeShown = false;
  }
  currentMode = mode;
};

/**
 * Generates the randomised Ubuntu login banner for the terminal header.
 *
 * @returns Multi-line banner text.
 */
export const generateSystemInfo = (): string => {
  const hostnames = [
    'innerview',
    'neural-node-01',
    'ai-core-01',
    'neural-net-host',
  ];
  const kernels = ['6.1.0-arch', '6.0.0-debian', '5.19.0-fedora'];

  const cpus = [
    'AMD Ryzen 9 7950X',
    'Intel Core i9-13900K',
    'AMD Threadripper 3990X',
  ];

  const randomHostname =
    hostnames[Math.floor(Math.random() * hostnames.length)];
  const randomKernel = kernels[Math.floor(Math.random() * kernels.length)];
  const randomCpu = cpus[Math.floor(Math.random() * cpus.length)];

  const ip = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

  const days = Math.floor(Math.random() * 7);
  const hours = Math.floor(Math.random() * 24);
  const minutes = Math.floor(Math.random() * 60);
  const uptime = `${days}d ${hours}h ${minutes}m`;

  const load1 = (Math.random() * 2).toFixed(2);
  const load2 = (Math.random() * 2).toFixed(2);
  const load3 = (Math.random() * 2).toFixed(2);
  const loadAverage = `${load1}, ${load2}, ${load3}`;

  const memory = `${Math.floor(Math.random() * 32 + 16)}GB`;
  const disk = `${Math.floor(Math.random() * 512 + 256)}GB SSD`;
  const users = Math.floor(Math.random() * 3 + 1);

  const currentTime = new Date().toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });

  return `Welcome to Ubuntu 22.04.3 LTS (GNU/Linux ${randomKernel})
Last login: ${currentTime} from ${ip}

System Information:
Hostname: ${randomHostname}
OS: Linux
Kernel: ${randomKernel}
Uptime: ${uptime}
CPU: ${randomCpu}
Memory: ${memory}
Disk: ${disk}
Users: ${users}
Load Average: ${loadAverage}
IP Address: ${ip}

[sudo] password for user: ************
Authentication successful. You now have root access.
user@${randomHostname}:~$ sudo su -
root@${randomHostname}:~#`;
};
