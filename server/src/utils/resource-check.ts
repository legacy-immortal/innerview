import os from 'os';
import { statfs } from 'fs/promises';
import { join } from 'path';

export interface ResourceRequirements {
  minFreeMemoryMB: number;
  minDiskSpaceMB: number;
  minCpuCores?: number;
}

export interface ResourceCheckResult {
  ok: boolean;
  totalMemoryMB: number;
  freeMemoryMB: number;
  cpuCores: number;
  diskFreeMB?: number;
  diskPath?: string;
  errors: string[];
  warnings: string[];
}

export async function checkSystemResources(
  requirements: ResourceRequirements,
  diskPath?: string
): Promise<ResourceCheckResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const totalMemoryMB = Math.round(os.totalmem() / 1024 / 1024);
  const freeMemoryMB = Math.round(os.freemem() / 1024 / 1024);
  const cpuCores = os.cpus().length;

  if (freeMemoryMB < requirements.minFreeMemoryMB) {
    errors.push(
      `Insufficient free memory: ${freeMemoryMB} MB available, ${requirements.minFreeMemoryMB} MB required`
    );
  }

  if (requirements.minCpuCores && cpuCores < requirements.minCpuCores) {
    warnings.push(
      `Low CPU cores: ${cpuCores} available, ${requirements.minCpuCores} recommended`
    );
  }

  let diskFreeMB: number | undefined;
  let diskPathChecked: string | undefined;

  if (diskPath) {
    try {
      const stats = await statfs(diskPath);
      const blockSize = stats.bsize;
      const availableBlocks = stats.bavail;
      const availableBytes = blockSize * availableBlocks;
      diskFreeMB = Math.round(availableBytes / 1024 / 1024);
      diskPathChecked = diskPath;

      if (diskFreeMB < requirements.minDiskSpaceMB) {
        errors.push(
          `Insufficient disk space at ${diskPath}: ${diskFreeMB} MB available, ${requirements.minDiskSpaceMB} MB required`
        );
      }
    } catch (err) {
      errors.push(`Failed to check disk space for ${diskPath}: ${err}`);
    }
  }

  const ok = errors.length === 0;

  return {
    ok,
    totalMemoryMB,
    freeMemoryMB,
    cpuCores,
    diskFreeMB,
    diskPath: diskPathChecked,
    errors,
    warnings,
  };
}

export function logResourceCheck(result: ResourceCheckResult): void {
  console.log('=== System Resource Check ===');
  console.log(`Memory: ${result.freeMemoryMB} MB free / ${result.totalMemoryMB} MB total`);
  console.log(`CPU cores: ${result.cpuCores}`);
  if (result.diskFreeMB !== undefined && result.diskPath) {
    console.log(`Disk ${result.diskPath}: ${result.diskFreeMB} MB free`);
  }
  if (result.warnings.length > 0) {
    console.warn('Warnings:');
    result.warnings.forEach((w) => console.warn(`  - ${w}`));
  }
  if (result.errors.length > 0) {
    console.error('Errors:');
    result.errors.forEach((e) => console.error(`  - ${e}`));
  }
  console.log(`Result: ${result.ok ? 'OK' : 'FAILED'}`);
  console.log('=============================');
}
