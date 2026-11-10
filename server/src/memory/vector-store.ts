// Vector store for associative memory.
//
// Cloud-first implementation:
// - Persists documents + embeddings in Turso/libSQL when configured
//   (TURSO_DATABASE_URL / TURSO_AUTH_TOKEN), falling back to in-memory storage.
// - Generates embeddings server-side by default (HuggingFace Transformers.js,
//   Xenova/all-MiniLM-L6-v2) so the cloud experience works without device compute.
// - faiss-node removed; similarity search is computed in-process over stored
//   vectors (cosine) which is sufficient for conversational memory scale.
//
// Browser/GPU-computed embeddings and client-side/local Turso replicas can be
// layered on later; this module keeps the public API stable for agent/tools.

import { createClient, type Client } from '@libsql/client';
import { pipeline } from '@huggingface/transformers';
import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/huggingface_transformers';
import { Document } from '@langchain/core/documents';
import { Embeddings } from '@langchain/core/embeddings';
import { FakeEmbeddings } from '@langchain/core/utils/testing';
import { cosineSimilarity as matrixCosineSimilarity } from '@langchain/core/utils/math';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { getConfig } from '../config/index.js';
import { TtlCache, hashText } from '../utils/cache.js';

interface StoredDocument {
  pageContent: string;
  metadata: Record<string, unknown>;
  embedding: number[];
}

function isValidVector(v: unknown): v is number[] {
  if (!Array.isArray(v) || v.length === 0) return false;
  return v.every((x) => typeof x === 'number' && !Number.isNaN(x));
}

function topKSimilar(
  queryEmbedding: number[],
  documents: readonly StoredDocument[],
  k: number
): Document[] {
  if (documents.length === 0 || !isValidVector(queryEmbedding)) {
    return [];
  }

  const topK = Math.max(1, Math.min(k, documents.length));
  const candidates: StoredDocument[] = [];
  const embeddings: number[][] = [];
  for (const doc of documents) {
    if (!isValidVector(doc.embedding)) continue;
    if (doc.embedding.length !== queryEmbedding.length) continue;
    candidates.push(doc);
    embeddings.push(doc.embedding);
  }
  if (candidates.length === 0) return [];

  let scores: number[];
  try {
    scores = matrixCosineSimilarity([queryEmbedding], embeddings)[0] ?? [];
  } catch {
    // Fallback: if matrix math fails for any reason, return no matches.
    return [];
  }

  // Top-k selection without fully sorting every document: O(n log k).
  const heap: Array<{ index: number; similarity: number }> = [];
  const heapPush = (item: { index: number; similarity: number }) => {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent].similarity <= heap[i].similarity) break;
      [heap[parent], heap[i]] = [heap[i], heap[parent]];
      i = parent;
    }
  };
  const heapPopRoot = () => {
    const root = heap[0];
    const last = heap.pop();
    if (last && heap.length > 0) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let smallest = i;
        if (
          left < heap.length &&
          heap[left].similarity < heap[smallest].similarity
        )
          smallest = left;
        if (
          right < heap.length &&
          heap[right].similarity < heap[smallest].similarity
        )
          smallest = right;
        if (smallest === i) break;
        [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
        i = smallest;
      }
    }
    return root;
  };

  for (let i = 0; i < candidates.length; i++) {
    const similarity = scores[i];
    if (typeof similarity !== 'number' || Number.isNaN(similarity)) continue;
    if (heap.length < topK) {
      heapPush({ index: i, similarity });
    } else if (similarity > heap[0].similarity) {
      heapPopRoot();
      heapPush({ index: i, similarity });
    }
  }

  return heap
    .sort((a, b) => b.similarity - a.similarity)
    .map(
      ({ index }) =>
        new Document({
          pageContent: candidates[index].pageContent,
          metadata: candidates[index].metadata,
        })
    );
}

// Cache for query embeddings: middleware and tools re-embed the same
// recent user text on every turn. Keyed by content hash, 5min TTL.
const queryEmbeddingCache = new TtlCache<string, number[]>({
  ttlMs: 5 * 60_000,
  maxEntries: 512,
});

async function embedQueryCached(
  embeddings: Embeddings,
  text: string
): Promise<number[]> {
  const key = hashText(text);
  const cached = queryEmbeddingCache.get(key);
  if (cached) return cached;
  const embedding = await embeddings.embedQuery(text);
  if (isValidVector(embedding)) queryEmbeddingCache.set(key, embedding);
  return embedding;
}

async function embedDocumentsBatch(
  embeddings: Embeddings,
  docs: Document[]
): Promise<number[][]> {
  if (docs.length === 0) return [];
  if (typeof embeddings.embedDocuments === 'function') {
    return embeddings.embedDocuments(docs.map((d) => d.pageContent));
  }
  return Promise.all(docs.map((d) => embeddings.embedQuery(d.pageContent)));
}

// In-memory fallback store (no persistence across restarts)
class InMemoryVectorStore {
  private documents: StoredDocument[] = [];

  async addStored(docs: StoredDocument[]): Promise<void> {
    this.documents.push(...docs);
  }

  async similaritySearch(
    queryEmbedding: number[],
    k: number
  ): Promise<Document[]> {
    return topKSimilar(queryEmbedding, this.documents, k);
  }

  async count(): Promise<number> {
    return this.documents.length;
  }

  async clear(): Promise<void> {
    this.documents = [];
  }
}

// Turso/libSQL-backed store (remote/persistent). Stores embeddings as JSON and
// computes cosine similarity in-process for broad compatibility; this avoids
// native FAISS while giving durable, centralized storage.
class TursoVectorStore {
  private client: Client;
  private initPromise: Promise<void> | null = null;

  constructor(url: string, authToken?: string) {
    this.client = createClient({
      url,
      authToken,
    });
  }

  private async ensureSchema(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = (async () => {
        await this.client.execute(`
          CREATE TABLE IF NOT EXISTS vector_memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            metadata TEXT,
            embedding TEXT NOT NULL,
            created_at TEXT NOT NULL
          )
        `);
        await this.client.execute(`
          CREATE INDEX IF NOT EXISTS idx_vector_memories_created_at
          ON vector_memories(created_at)
        `);
      })();
    }
    await this.initPromise;
  }

  async addStored(docs: StoredDocument[]): Promise<void> {
    if (docs.length === 0) return;
    await this.ensureSchema();
    const now = new Date().toISOString();
    // Insert sequentially to keep it simple/reliable across libSQL drivers.
    for (const doc of docs) {
      if (!isValidVector(doc.embedding)) continue;
      await this.client.execute({
        sql: `INSERT INTO vector_memories (content, metadata, embedding, created_at)
              VALUES (?, ?, ?, ?)`,
        args: [
          doc.pageContent,
          JSON.stringify(doc.metadata || {}),
          JSON.stringify(doc.embedding),
          now,
        ],
      });
    }
  }

  async similaritySearch(
    queryEmbedding: number[],
    k: number
  ): Promise<Document[]> {
    await this.ensureSchema();
    if (!isValidVector(queryEmbedding)) return [];
    const res = await this.client.execute(
      'SELECT content, metadata, embedding FROM vector_memories'
    );
    const docs: StoredDocument[] = [];
    for (const row of res.rows) {
      try {
        const content = String(row.content ?? '');
        const metadataRaw = row.metadata;
        const embeddingRaw = row.embedding;
        const metadata =
          typeof metadataRaw === 'string' && metadataRaw
            ? (JSON.parse(metadataRaw) as Record<string, unknown>)
            : {};
        const embedding =
          typeof embeddingRaw === 'string' && embeddingRaw
            ? (JSON.parse(embeddingRaw) as number[])
            : [];
        if (!isValidVector(embedding)) continue;
        docs.push({ pageContent: content, metadata, embedding });
      } catch {
        // Skip malformed rows.
      }
    }
    return topKSimilar(queryEmbedding, docs, k);
  }

  async count(): Promise<number> {
    await this.ensureSchema();
    const res = await this.client.execute(
      'SELECT COUNT(*) as count FROM vector_memories'
    );
    const row = res.rows[0] as Record<string, unknown> | undefined;
    const value = row?.count ?? 0;
    return typeof value === 'number' ? value : Number(value) || 0;
  }

  async clear(): Promise<void> {
    await this.ensureSchema();
    await this.client.execute('DELETE FROM vector_memories');
  }
}

// Main vector store class with Turso persistence (when configured) and
// server-side embedding generation for a smooth cloud baseline.
class VectorStore {
  private store: InMemoryVectorStore | TursoVectorStore | null = null;
  private embeddings: Embeddings | null = null;
  private initialized = false;
  private embeddingsInitializing = false;
  private readonly modelName = 'Xenova/all-MiniLM-L6-v2';
  private readonly modelCacheDir = join(
    process.cwd(),
    'server',
    'models',
    this.modelName
  );
  private initializationError: Error | null = null;
  private modelDownloading = false;

  private async ensureStore(): Promise<InMemoryVectorStore | TursoVectorStore> {
    if (this.store) return this.store;
    try {
      const storage = getConfig().storage;
      const url = storage.tursoDatabaseUrl || storage.vectorDbUrl;
      if (url) {
        this.store = new TursoVectorStore(url, storage.tursoAuthToken);
        console.log('[VectorStore] Using Turso/libSQL vector store');
        return this.store;
      }
    } catch (error) {
      console.warn(
        '[VectorStore] Failed to initialize Turso store, falling back to in-memory:',
        error instanceof Error ? error.message : String(error)
      );
    }
    this.store = new InMemoryVectorStore();
    console.log('[VectorStore] Using in-memory vector store (no Turso config)');
    return this.store;
  }

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

      if (!existsSync(this.modelCacheDir)) {
        await mkdir(this.modelCacheDir, { recursive: true });
        console.log(`[VectorStore] Created directory: ${this.modelCacheDir}`);
      }

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

      console.log(`[VectorStore] Testing downloaded model...`);
      const testEmbedding = await extractor('test', { pooling: 'mean' });
      console.log(
        `[VectorStore] Model test successful! Embedding dimension: ${testEmbedding.data.length}`
      );

      // Transformers.js creates nested structure: {cache_dir}/{model_id}/{model_id}/
      const nestedPath = join(
        this.modelCacheDir,
        this.modelName,
        this.modelName
      );

      if (existsSync(nestedPath)) {
        console.log(`[VectorStore] Flattening model structure...`);
        await this.copyRecursive(nestedPath, this.modelCacheDir);
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

    if (this.embeddingsInitializing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return this.embeddings || null;
    }

    this.embeddingsInitializing = true;

    try {
      try {
        console.log(
          `[VectorStore] Attempting to initialize HuggingFace embeddings (model: ${this.modelName})`
        );
        console.log(
          `[VectorStore] Using model cache directory: ${this.modelCacheDir}`
        );

        const configPath = join(this.modelCacheDir, 'config.json');
        const useLocalFiles = existsSync(configPath);

        if (!useLocalFiles) {
          console.log(
            `[VectorStore] No local model found, downloading automatically...`
          );
          await this.downloadModel();
        }

        const configExists = existsSync(configPath);
        if (configExists) {
          console.log(
            `[VectorStore] Local model found, using local_files_only mode`
          );
          this.embeddings = new HuggingFaceTransformersEmbeddings({
            model: this.modelCacheDir,
            pretrainedOptions: {
              local_files_only: true,
            },
          });
        } else {
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

        await this.embeddings.embedQuery('test');
        console.log(
          `[VectorStore] Successfully initialized HuggingFace embeddings`
        );
        return this.embeddings;
      } catch (hfError) {
        console.warn(
          `[VectorStore] HuggingFace embeddings failed (model: ${this.modelName}), falling back to FakeEmbeddings. Error: ${hfError instanceof Error ? hfError.message : String(hfError)}`
        );
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

  private async ensureInitialized(): Promise<void> {
    if (this.initialized && this.store) return;
    await this.ensureStore();
    this.initialized = true;
  }

  /**
   * Add documents to the store.
   *
   * Cloud-smooth default: if a document does not include a precomputed embedding
   * in `metadata.embedding` (number[]), the server generates one.
   * To offload compute (e.g. browser/GPU), callers may provide
   * `metadata.embedding` (and keep model/dimension consistent with stored vectors).
   */
  async addDocuments(docs: Document[]): Promise<void> {
    await this.ensureInitialized();
    const store = this.store;
    if (!store) {
      console.warn('Vector store not available. Documents not added.');
      return;
    }

    try {
      const stored: StoredDocument[] = [];
      const toEmbed: Array<{ index: number; doc: Document }> = [];

      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        const meta = (doc.metadata || {}) as Record<string, unknown>;
        const provided = meta.embedding;
        if (isValidVector(provided)) {
          stored.push({
            pageContent: doc.pageContent,
            metadata: meta,
            embedding: provided,
          });
        } else {
          toEmbed.push({ index: i, doc });
        }
      }

      if (toEmbed.length > 0) {
        const embeddings = await this.getEmbeddings();
        if (!embeddings) {
          console.warn(
            'Embeddings unavailable; documents without precomputed embeddings were not added.'
          );
        } else {
          const vectors = await embedDocumentsBatch(
            embeddings,
            toEmbed.map((x) => x.doc)
          );
          for (let j = 0; j < toEmbed.length; j++) {
            const embedding = vectors[j] ?? [];
            if (!isValidVector(embedding)) continue;
            const doc = toEmbed[j].doc;
            stored.push({
              pageContent: doc.pageContent,
              metadata: (doc.metadata || {}) as Record<string, unknown>,
              embedding,
            });
          }
        }
      }

      if (stored.length === 0) return;
      await store.addStored(stored);
    } catch (error) {
      console.warn('Failed to add documents to vector store:', error);
    }
  }

  async similaritySearch(
    query: string,
    k: number = 3,
    _filter?: Record<string, unknown>
  ): Promise<Document[]> {
    await this.ensureInitialized();
    const store = this.store;
    if (!store) {
      return [];
    }

    try {
      const embeddings = await this.getEmbeddings();
      if (!embeddings) {
        return [];
      }
      const queryEmbedding = await embedQueryCached(embeddings, query);
      return await store.similaritySearch(queryEmbedding, k);
    } catch (error) {
      console.warn('Vector store similarity search failed:', error);
      return [];
    }
  }

  /**
   * Search using a precomputed query embedding (e.g. computed in-browser).
   * Dimension/model must match stored vectors.
   */
  async similaritySearchByEmbedding(
    queryEmbedding: number[],
    k: number = 3
  ): Promise<Document[]> {
    await this.ensureInitialized();
    const store = this.store;
    if (!store || !isValidVector(queryEmbedding)) {
      return [];
    }
    try {
      return await store.similaritySearch(queryEmbedding, k);
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

  async getDocumentCount(): Promise<number> {
    await this.ensureInitialized();
    if (!this.store) return 0;
    try {
      return await this.store.count();
    } catch {
      return 0;
    }
  }

  async clearAll(): Promise<void> {
    await this.ensureInitialized();
    if (!this.store) {
      console.warn(
        '[VectorStore] Cannot clear vector store - store not available'
      );
      return;
    }
    try {
      await this.store.clear();
      console.log('[VectorStore] Cleared vector store');
    } catch (error) {
      console.warn(
        `[VectorStore] Failed to clear vector store:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}

export const vectorStore = new VectorStore();
