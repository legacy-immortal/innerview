#!/usr/bin/env node
/**
 * Download script for Hugging Face embedding models
 * Downloads the Xenova/all-MiniLM-L6-v2 model to a local directory
 * so it can be used without connecting to Hugging Face Hub
 */

import { pipeline } from '@huggingface/transformers';
import { mkdir, readdir, copyFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Model configuration
const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
// Get the directory where this script is located (scripts/)
// Then go up one level to project root, then to server/models
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MODEL_CACHE_DIR = join(__dirname, '..', 'server', 'models', MODEL_ID);

// Recursively copy directory contents
async function copyRecursive(source, target) {
  const entries = await readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = join(source, entry.name);
    const targetPath = join(target, entry.name);

    if (entry.isDirectory()) {
      await mkdir(targetPath, { recursive: true });
      await copyRecursive(sourcePath, targetPath);
    } else {
      await copyFile(sourcePath, targetPath);
    }
  }
}

async function downloadModel() {
  console.log(`[Download] Starting download of ${MODEL_ID}...`);
  console.log(`[Download] Target directory: ${MODEL_CACHE_DIR}`);

  // Ensure the directory exists
  if (!existsSync(MODEL_CACHE_DIR)) {
    await mkdir(MODEL_CACHE_DIR, { recursive: true });
    console.log(`[Download] Created directory: ${MODEL_CACHE_DIR}`);
  }

  try {
    // Download the model by initializing the pipeline
    // This will download all necessary files to the cache
    console.log(
      `[Download] Initializing pipeline to trigger model download...`
    );

    const extractor = await pipeline('feature-extraction', MODEL_ID, {
      progress_callback: (progress) => {
        if (progress.status === 'downloading') {
          const percent = progress.progress
            ? Math.round((progress.loaded / progress.total) * 100)
            : 0;
          process.stdout.write(
            `\r[Download] Progress: ${percent}% - ${progress.file || 'Downloading...'}`
          );
        } else if (progress.status === 'ready') {
          console.log('\n[Download] Model ready!');
        }
      },
      cache_dir: MODEL_CACHE_DIR,
    });

    // Test the model to ensure it works
    console.log(`[Download] Testing model...`);
    const testEmbedding = await extractor('test', { pooling: 'mean' });
    console.log(
      `[Download] Model test successful! Embedding dimension: ${testEmbedding.data.length}`
    );

    // Transformers.js creates nested structure: {cache_dir}/{model_id}/{model_id}/
    // Move files to flat structure: {cache_dir}/
    const nestedPath = join(MODEL_CACHE_DIR, MODEL_ID, MODEL_ID);
    if (existsSync(nestedPath)) {
      console.log(`[Download] Flattening model structure...`);
      await copyRecursive(nestedPath, MODEL_CACHE_DIR);

      // Remove nested directory structure
      console.log(`[Download] Removing nested directory structure...`);
      await rm(join(MODEL_CACHE_DIR, MODEL_ID), {
        recursive: true,
        force: true,
      });
      console.log(`[Download] Model files flattened to: ${MODEL_CACHE_DIR}`);
    }

    console.log(
      `\n[Download] ✅ Model downloaded successfully to: ${MODEL_CACHE_DIR}`
    );
    console.log(
      `[Download] You can now use this model with local_files_only: true`
    );

    return MODEL_CACHE_DIR;
  } catch (error) {
    console.error(`[Download] ❌ Error downloading model:`, error);
    throw error;
  }
}

// Run the download
downloadModel()
  .then((cacheDir) => {
    console.log(`\n[Download] Complete! Model is available at: ${cacheDir}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`\n[Download] Failed:`, error);
    process.exit(1);
  });
