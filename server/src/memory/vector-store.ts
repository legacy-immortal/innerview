// Vector store for associative memory using local HuggingFace embeddings
//
// This implementation uses:
// - HuggingFace Transformers.js for local embedding generation (no API calls required)
// - Xenova/all-MiniLM-L6-v2 model for high-quality sentence embeddings
// - Automatic model download if not found locally
// - Fallback to in-memory similarity search when FAISS unavailable (no native dependencies)
// - File-based persistence when possible

import { pipeline } from '@huggingface/transformers';
import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/huggingface_transformers';
import { Document } from '@langchain/core/documents';
import { Embeddings } from '@langchain/core/embeddings';
import { FakeEmbeddings } from '@langchain/core/utils/testing';
import { existsSync } from 'node:fs';
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';

interface StoredDocument {
  pageContent: string;
  metadata: Record<string, unknown>;
  embedding: number[];
}

function isValidVector(v: unknown): v is number[] {
  if (!Array.isArray(v) || v.length === 0) return false;
  return v.every((x) => typeof x === 'number' && !Number.isNaN(x));
}

// In-memory vector store that works without native dependencies (FAISS fallback)
class InMemoryVectorStore {
  private documents: StoredDocument[] = [];
  private embeddings: Embeddings;

  constructor(embeddings: Embeddings) {
    this.embeddings = embeddings;
  }

  async addDocuments(docs: Document[]): Promise<void> {
    for (const doc of docs) {
      const embedding = await this.embeddings.embedQuery(doc.pageContent);
      this.documents.push({
        pageContent: doc.pageContent,
        metadata: doc.metadata || {},
        embedding,
      });
    }
  }

  async similaritySearch(query: string, k: number = 3): Promise<Document[]> {
    if (this.documents.length === 0) {
      return [];
    }

    const queryEmbedding = await this.embeddings.embedQuery(query);
    if (!isValidVector(queryEmbedding)) {
      return [];
    }

    // Only consider documents with valid embeddings; skip invalid ones
    const similarities = this.documents
      .filter((doc) => isValidVector(doc.embedding))
      .map((doc) => ({
        doc,
        similarity: this.cosineSimilarity(queryEmbedding, doc.embedding),
      }));

    // Sort by similarity and return top k
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k)
      .map(
        ({ doc }) =>
          new Document({
            pageContent: doc.pageContent,
            metadata: doc.metadata,
          })
      );
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (!isValidVector(a) || !isValidVector(b) || a.length !== b.length) {
      return 0;
    }
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      const ai = a[i];
      const bi = b[i];
      if (
        typeof ai !== 'number' ||
        typeof bi !== 'number' ||
        Number.isNaN(ai) ||
        Number.isNaN(bi)
      ) {
        return 0;
      }
      dotProduct += ai * bi;
      normA += ai * ai;
      normB += bi * bi;
    }
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  async save(path: string): Promise<void> {
    await mkdir(path, { recursive: true });
    const dataPath = join(path, 'docstore.json');
    await writeFile(dataPath, JSON.stringify(this.documents, null, 2), 'utf-8');
  }

  async load(path: string): Promise<void> {
    const dataPath = join(path, 'docstore.json');
    if (existsSync(dataPath)) {
      try {
        const content = await readFile(dataPath, 'utf-8');
        const raw = JSON.parse(content) as StoredDocument[];
        this.documents = Array.isArray(raw)
          ? raw.filter((doc) => doc && isValidVector(doc.embedding))
          : [];
      } catch {
        console.warn(`Failed to load documents from ${dataPath}`);
        this.documents = [];
      }
    }
  }

  getDocumentCount(): number {
    return this.documents.length;
  }

  clear(): void {
    this.documents = [];
  }
}

// Main vector store class with graceful fallback
class VectorStore {
  private store: InMemoryVectorStore | null = null;
  private embeddings: Embeddings | null = null;
  private initialized = false;
  private embeddingsInitializing = false;
  private readonly storePath = join(
    process.cwd(),
    'server',
    'data',
    'vector-store'
  );
  private readonly modelName = 'Xenova/all-MiniLM-L6-v2';
  private readonly modelCacheDir = join(
    process.cwd(),
    'server',
    'models',
    this.modelName
  );
  private initializationError: Error | null = null;
  private modelDownloading = false;

  // Recursively copy directory contents
  private async copyRecursive(source: string, target: string): Promise<void> {
    const entries = await readdir(source, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = join(source, entry.name);
      const targetPath = join(target, entry.name);

      if (entry.isDirectory()) {
        await mkdir(targetPath, { recursive: true });
        await this.copyRecursive(sourcePath, targetPath);
      } else {
        await copyFile(sourcePath, targetPath);
      }
    }
  }

  private async downloadModel(): Promise<void> {
    if (this.modelDownloading) {
      // Wait for ongoing download
      while (this.modelDownloading) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return;
    }

    this.modelDownloading = true;

    try {
      console.log(`[VectorStore] Starting download of ${this.modelName}...`);
      console.log(`[VectorStore] Target directory: ${this.modelCacheDir}`);

      // Ensure the directory exists
      if (!existsSync(this.modelCacheDir)) {
        await mkdir(this.modelCacheDir, { recursive: true });
        console.log(`[VectorStore] Created directory: ${this.modelCacheDir}`);
      }

      // Download the model by initializing the pipeline
      console.log(
        `[VectorStore] Initializing pipeline to trigger model download...`
      );

      const extractor = await pipeline('feature-extraction', this.modelName, {
        progress_callback: (progress: {
          status: string;
          progress?: number | { loaded: number; total: number };
          file?: string;
          loaded?: number;
          total?: number;
        }) => {
          if (progress.status === 'downloading') {
            let percent = 0;
            if (typeof progress.progress === 'number') {
              percent = Math.round(progress.progress * 100);
            } else if (progress.progress) {
              percent = Math.round(
                (progress.progress.loaded / progress.progress.total) * 100
              );
            } else if (progress.loaded && progress.total) {
              percent = Math.round((progress.loaded / progress.total) * 100);
            }
            process.stdout.write(
              `\r[VectorStore] Download progress: ${percent}% - ${progress.file || 'Downloading...'}`
            );
          } else if (progress.status === 'ready') {
            console.log('\n[VectorStore] Model ready!');
          }
        },
        cache_dir: this.modelCacheDir,
      });

      // Test the model to ensure it works
      console.log(`[VectorStore] Testing downloaded model...`);
      const testEmbedding = await extractor('test', { pooling: 'mean' });
      console.log(
        `[VectorStore] Model test successful! Embedding dimension: ${testEmbedding.data.length}`
      );

      // Transformers.js creates nested structure: {cache_dir}/{model_id}/{model_id}/
      // Move files to flat structure: {cache_dir}/
      const nestedPath = join(
        this.modelCacheDir,
        this.modelName,
        this.modelName
      );

      if (existsSync(nestedPath)) {
        console.log(`[VectorStore] Flattening model structure...`);
        await this.copyRecursive(nestedPath, this.modelCacheDir);

        // Remove nested directory structure
        console.log(`[VectorStore] Removing nested directory structure...`);
        await rm(join(this.modelCacheDir, this.modelName), {
          recursive: true,
          force: true,
        });
        console.log(
          `[VectorStore] Model files flattened to: ${this.modelCacheDir}`
        );
      }

      console.log(
        `[VectorStore] ✅ Model downloaded successfully to: ${this.modelCacheDir}`
      );
    } catch (error) {
      console.error(
        `[VectorStore] ❌ Error downloading model:`,
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    } finally {
      this.modelDownloading = false;
    }
  }

  private async getEmbeddings(): Promise<Embeddings | null> {
    if (this.embeddings) {
      return this.embeddings;
    }

    if (this.initializationError) {
      return null;
    }

    // Prevent multiple simultaneous initialization attempts
    if (this.embeddingsInitializing) {
      // Wait a bit and check again
      await new Promise((resolve) => setTimeout(resolve, 100));
      return this.embeddings || null;
    }

    this.embeddingsInitializing = true;

    try {
      // Try HuggingFace embeddings first
      try {
        console.log(
          `[VectorStore] Attempting to initialize HuggingFace embeddings (model: ${this.modelName})`
        );
        console.log(
          `[VectorStore] Using model cache directory: ${this.modelCacheDir}`
        );

        // Check if local model exists (flat structure: model files directly in cache dir)
        const configPath = join(this.modelCacheDir, 'config.json');
        const useLocalFiles = existsSync(configPath);

        if (!useLocalFiles) {
          // Model not found, download it automatically
          console.log(
            `[VectorStore] No local model found, downloading automatically...`
          );
          await this.downloadModel();
        }

        // Check again after download attempt
        const configExists = existsSync(configPath);
        if (configExists) {
          console.log(
            `[VectorStore] Local model found, using local_files_only mode`
          );
          console.log(`[VectorStore] Model path: ${this.modelCacheDir}`);
          // When using local files, point directly to the cache directory
          this.embeddings = new HuggingFaceTransformersEmbeddings({
            model: this.modelCacheDir,
            pretrainedOptions: {
              local_files_only: true,
            },
          });
        } else {
          // Fallback: try downloading via HuggingFaceTransformersEmbeddings
          console.log(
            `[VectorStore] Attempting to download via HuggingFaceTransformersEmbeddings...`
          );

          this.embeddings = new HuggingFaceTransformersEmbeddings({
            model: this.modelName,
            pretrainedOptions: {
              cache_dir: this.modelCacheDir,
              local_files_only: false,
            },
          });
        }

        // Test the embeddings to ensure they work
        await this.embeddings.embedQuery('test');
        console.log(
          `[VectorStore] Successfully initialized HuggingFace embeddings`
        );
        return this.embeddings;
      } catch (hfError) {
        console.warn(
          `[VectorStore] HuggingFace embeddings failed (model: ${this.modelName}), falling back to FakeEmbeddings. Error: ${hfError instanceof Error ? hfError.message : String(hfError)}`
        );

        // Fall back to FakeEmbeddings for development/testing
        this.embeddings = new FakeEmbeddings();

        console.log(`[VectorStore] Using FakeEmbeddings as fallback`);
        return this.embeddings;
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.initializationError = err;
      this.embeddings = null;
      console.error(
        `[VectorStore] Failed to initialize any embeddings. Vector store will operate in degraded mode. Error: ${err.message}`
      );
      return null;
    } finally {
      this.embeddingsInitializing = false;
    }
  }

  private async ensureDirectoryExists(): Promise<void> {
    if (!existsSync(this.storePath)) {
      try {
        console.log(`[VectorStore] Creating directory: ${this.storePath}`);
        await mkdir(this.storePath, { recursive: true });
        console.log(
          `[VectorStore] Directory created successfully: ${this.storePath}`
        );
      } catch (error) {
        console.warn(
          `[VectorStore] Failed to create vector-store directory at ${this.storePath}:`,
          error
        );
        throw error;
      }
    } else {
      console.log(`[VectorStore] Directory already exists: ${this.storePath}`);
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized && this.store) return;

    const embeddings = await this.getEmbeddings();

    if (!embeddings) {
      // Embeddings not available - operate in degraded mode
      this.initialized = true;
      return;
    }

    console.log(
      `[VectorStore] Initializing vector store at: ${this.storePath}`
    );

    await this.ensureDirectoryExists();

    try {
      // Create in-memory store (no native dependencies)
      this.store = new InMemoryVectorStore(embeddings);

      // Try to load persisted documents
      try {
        await this.store.load(this.storePath);
        console.log(`[VectorStore] Loaded persisted documents`);
      } catch {
        console.log(
          `[VectorStore] No persisted documents found, starting fresh`
        );
      }

      this.initialized = true;
    } catch (error) {
      console.error(`[VectorStore] Failed to initialize vector store:`, error);
      // Don't throw - allow degraded mode
      this.initialized = true;
    }
  }

  async addDocuments(docs: Document[]): Promise<void> {
    await this.ensureInitialized();
    if (!this.store) {
      console.warn(
        'Vector store not available (embeddings failed to load). Documents not added.'
      );
      return;
    }

    await this.store.addDocuments(docs);

    // Save to disk for persistence
    try {
      await this.ensureDirectoryExists();
      await this.store.save(this.storePath);
    } catch (error) {
      console.warn('Failed to save vector store:', error);
    }
  }

  async similaritySearch(
    query: string,
    k: number = 3,
    _filter?: Record<string, unknown>
  ): Promise<Document[]> {
    await this.ensureInitialized();
    if (!this.store) {
      // Return empty array if store not available (graceful degradation)
      return [];
    }

    try {
      return await this.store.similaritySearch(query, k);
    } catch (error) {
      console.warn('Vector store similarity search failed:', error);
      return [];
    }
  }

  async addText(
    text: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.addDocuments([
      new Document({
        pageContent: text,
        metadata: metadata || {},
      }),
    ]);
  }

  // Additional methods for memory management
  async getDocumentCount(): Promise<number> {
    await this.ensureInitialized();
    if (!this.store) {
      return 0;
    }

    return this.store.getDocumentCount();
  }

  async clearAll(): Promise<void> {
    const embeddings = await this.getEmbeddings();
    if (!embeddings) {
      console.warn(
        '[VectorStore] Cannot clear vector store - embeddings not available'
      );
      return;
    }

    // Create new empty store
    this.store = new InMemoryVectorStore(embeddings);
    this.initialized = true;

    try {
      await this.ensureDirectoryExists();
      await this.store.save(this.storePath);
      console.log(`[VectorStore] Cleared vector store at: ${this.storePath}`);
    } catch (error) {
      console.warn(
        `[VectorStore] Failed to save cleared vector store at ${this.storePath}:`,
        error
      );
    }
  }
}

export const vectorStore = new VectorStore();
