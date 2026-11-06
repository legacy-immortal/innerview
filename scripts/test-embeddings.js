#!/usr/bin/env node
/**
 * Test script to verify embeddings are working with local models
 */

import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/huggingface_transformers';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
// Get the directory where this script is located (server/scripts)
// Then go up one level to server, then to models
const MODEL_CACHE_DIR = join(__dirname, '..', 'models', 'embeddings', MODEL_ID);

async function testEmbeddings() {
  console.log(`[Test] Testing embeddings with model: ${MODEL_ID}`);
  console.log(`[Test] Model cache directory: ${MODEL_CACHE_DIR}`);

  // Check for nested model path (transformers.js creates {cache_dir}/{model_id}/)
  const nestedModelPath = join(MODEL_CACHE_DIR, MODEL_ID);
  const useLocalFiles = existsSync(nestedModelPath);
  console.log(
    `[Test] Local model ${useLocalFiles ? 'found' : 'not found'}, using ${useLocalFiles ? 'local' : 'remote'} mode`
  );
  if (useLocalFiles) {
    console.log(`[Test] Using nested model path: ${nestedModelPath}`);
  }

  try {
    const embeddings = useLocalFiles
      ? new HuggingFaceTransformersEmbeddings({
          model: nestedModelPath,
          pretrainedOptions: {
            local_files_only: true,
          },
        })
      : new HuggingFaceTransformersEmbeddings({
          model: MODEL_ID,
          pretrainedOptions: {
            cache_dir: MODEL_CACHE_DIR,
            local_files_only: false,
          },
        });

    console.log(`[Test] Initializing embeddings...`);
    const testQuery = 'This is a test query to verify embeddings work.';
    const result = await embeddings.embedQuery(testQuery);

    console.log(`[Test] ✅ Success! Embedding generated:`);
    console.log(`[Test]   - Dimension: ${result.length}`);
    console.log(
      `[Test]   - First 5 values: [${result.slice(0, 5).join(', ')}]`
    );

    // Test multiple documents
    console.log(`[Test] Testing multiple documents...`);
    const documents = [
      'First document about artificial intelligence.',
      'Second document about machine learning.',
      'Third document about natural language processing.',
    ];
    const docResults = await embeddings.embedDocuments(documents);
    console.log(
      `[Test] ✅ Successfully embedded ${docResults.length} documents`
    );
    console.log(
      `[Test]   - Each document has ${docResults[0].length} dimensions`
    );

    console.log(
      `\n[Test] ✅ All tests passed! Embeddings are working correctly.`
    );
    process.exit(0);
  } catch (error) {
    console.error(`[Test] ❌ Error testing embeddings:`, error);
    if (error instanceof Error) {
      console.error(`[Test] Error message: ${error.message}`);
      console.error(`[Test] Stack: ${error.stack}`);
    }
    process.exit(1);
  }
}

testEmbeddings();
