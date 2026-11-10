import { Hono } from 'hono';
import { Document } from '@langchain/core/documents';
import { vectorStore } from '../memory/vector-store.js';

const app = new Hono();

/**
 * Add associative-memory documents.
 * Cloud-smooth default: server computes embeddings when not provided.
 * Client offload path: include `metadata.embedding` (number[]) per document.
 */
app.post('/api/memory/add', async (c) => {
  try {
    const body = (await c.req.json()) as {
      documents?: Array<{
        content?: string;
        metadata?: Record<string, unknown>;
      }>;
    };
    const docsInput = Array.isArray(body.documents) ? body.documents : [];
    if (docsInput.length === 0) {
      return c.json({ error: 'documents array is required' }, 400);
    }

    const docs: Document[] = [];
    for (const item of docsInput) {
      const content =
        typeof item?.content === 'string' ? item.content.trim() : '';
      if (!content) continue;
      const metadata =
        item?.metadata && typeof item.metadata === 'object'
          ? (item.metadata as Record<string, unknown>)
          : {};
      docs.push(new Document({ pageContent: content, metadata }));
    }
    if (docs.length === 0) {
      return c.json({ error: 'no valid documents with content' }, 400);
    }

    await vectorStore.addDocuments(docs);
    const count = await vectorStore.getDocumentCount();
    return c.json({ ok: true, added: docs.length, count });
  } catch (error) {
    return c.json(
      {
        error: 'Failed to add memory documents',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

/**
 * Similarity search over associative memory.
 * Provide either `query` (server computes embedding) or `embedding` (precomputed)
 * as a fallback/offload path. If both provided, `embedding` is used.
 */
app.post('/api/memory/search', async (c) => {
  try {
    const body = (await c.req.json()) as {
      query?: string;
      embedding?: number[];
      k?: number;
    };
    const k =
      typeof body.k === 'number' && Number.isFinite(body.k)
        ? Math.max(1, Math.min(20, Math.floor(body.k)))
        : 3;

    let results;
    if (Array.isArray(body.embedding)) {
      results = await vectorStore.similaritySearchByEmbedding(
        body.embedding,
        k
      );
    } else if (typeof body.query === 'string' && body.query.trim()) {
      results = await vectorStore.similaritySearch(body.query.trim(), k);
    } else {
      return c.json({ error: 'query or embedding is required' }, 400);
    }

    return c.json({
      ok: true,
      results: results.map((d) => ({
        content: d.pageContent,
        metadata: d.metadata,
      })),
    });
  } catch (error) {
    return c.json(
      {
        error: 'Failed to search memory',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

export default app;
