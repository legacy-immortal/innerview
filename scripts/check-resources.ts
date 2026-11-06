#!/usr/bin/env bun
import os from 'os';
import { statfs } from 'fs/promises';
import { resolve } from 'path';

const MIN_FREE_MEMORY_MB = 1024;
const MIN_DISK_SPACE_MB = 2048;
const MIN_CPU_CORES = 2;
const DISK_PATH = resolve(process.cwd(), 'server/models');

async function checkResources() {
  console.log('=== Innerview Resource Pre-check ===');

  const totalMemoryMB = Math.round(os.totalmem() / 1024 / 1024);
  const freeMemoryMB = Math.round(os.freemem() / 1024 / 1024);
  const cpuCores = os.cpus().length;

  console.log(`Memory: ${freeMemoryMB} MB free / ${totalMemoryMB} MB total`);
  console.log(`CPU cores: ${cpuCores}`);

  let diskFreeMB = 0;
  try {
    const stats = await statfs(DISK_PATH);
    const availableBytes = stats.bsize * stats.bavail;
    diskFreeMB = Math.round(availableBytes / 1024 / 1024);
    console.log(`Disk ${DISK_PATH}: ${diskFreeMB} MB free`);
  } catch {
    console.warn(`Could not stat disk path ${DISK_PATH}, skipping disk check`);
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  if (freeMemoryMB < MIN_FREE_MEMORY_MB) {
    errors.push(`Free memory ${freeMemoryMB} MB < required ${MIN_FREE_MEMORY_MB} MB`);
  }
  if (diskFreeMB > 0 && diskFreeMB < MIN_DISK_SPACE_MB) {
    errors.push(`Disk free ${diskFreeMB} MB < required ${MIN_DISK_SPACE_MB} MB`);
  }
  if (cpuCores < MIN_CPU_CORES) {
    warnings.push(`CPU cores ${cpuCores} < recommended ${MIN_CPU_CORES}`);
  }

  if (warnings.length) {
    console.warn('Warnings:');
    warnings.forEach(w => console.warn(`  - ${w}`));
  }

  if (errors.length) {
    console.error('Errors:');
    errors.forEach(e => console.error(`  - ${e}`));
    console.error('Aborting: insufficient resources to install/load models.');
    process.exit(1);
  }

  console.log('Resource check passed. Proceeding.');
  console.log('====================================');
}

checkResources();
