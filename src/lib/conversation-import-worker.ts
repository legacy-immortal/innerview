/**
 * @file Web Worker for parsing and converting conversation import files off the main thread.
 * @module lib/conversation-import-worker.ts
 */

import {
  importConversation,
  type DeepSeekConversation,
  type InterlocutorConversation,
} from './conversation-importer';
import type { Conversation, ConversationMessage } from './conversation-store';
import type { UIMessage } from 'ai';

export interface ImportWorkerRequest {
  readonly id: number;
  readonly text: string;
}

export interface ImportWorkerProgress {
  readonly type: 'progress';
  readonly id: number;
  readonly step: string;
  readonly progress: number; // 0-100
}

export interface ImportWorkerResultSingle {
  readonly conversation: Conversation;
  readonly messages: UIMessage[];
  readonly conversationMessages?: ConversationMessage[];
}

export interface ImportWorkerSuccess {
  readonly type: 'success';
  readonly id: number;
  readonly result:
    | { type: 'single'; data: ImportWorkerResultSingle }
    | { type: 'multiple'; data: ImportWorkerResultSingle[] };
}

export interface ImportWorkerError {
  readonly type: 'error';
  readonly id: number;
  readonly error: string;
}

export type ImportWorkerResponse =
  ImportWorkerProgress | ImportWorkerSuccess | ImportWorkerError;

function post(msg: ImportWorkerResponse): void {
  self.postMessage(msg);
}

/**
 * Ensure the result is structured-cloneable/plain data before posting it back
 * to the main thread. Some converted payloads can include non-cloneable values
 * (or odd prototypes) which would crash the worker at handoff.
 */
function toCloneable<T>(value: T): T {
  try {
    if (typeof structuredClone === 'function') {
      return structuredClone(value);
    }
  } catch {
    // Fall through to JSON normalization.
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

self.onmessage = (event: MessageEvent<ImportWorkerRequest>) => {
  const { id, text } = event.data;
  try {
    post({ type: 'progress', id, step: 'Parsing JSON...', progress: 2 });

    const json = JSON.parse(text) as
      | DeepSeekConversation
      | InterlocutorConversation
      | (DeepSeekConversation | InterlocutorConversation)[];

    if (Array.isArray(json)) {
      const total = json.length || 1;
      const data: ImportWorkerResultSingle[] = [];
      for (let i = 0; i < json.length; i++) {
        const conv = json[i];
        const progressCallback = (
          step: string,
          current: number,
          stepTotal: number
        ) => {
          // Reserve 0-5% for parse/setup, 5-90% for conversion, 90-100% for finalize.
          const convBase = 5 + (i / total) * 85;
          const convSpan = 85 / total;
          const inner =
            stepTotal > 0 ? Math.min(1, Math.max(0, current / stepTotal)) : 0;
          const progress = Math.min(
            90,
            Math.floor(convBase + inner * convSpan)
          );
          post({
            type: 'progress',
            id,
            step: `Converting conversation ${i + 1}/${total}: ${step}`,
            progress,
          });
        };

        progressCallback('Starting...', 0, 1);
        data.push(importConversation(conv, progressCallback));
      }
      post({ type: 'progress', id, step: 'Finalizing...', progress: 92 });
      const result = toCloneable({ type: 'multiple' as const, data });
      post({ type: 'success', id, result });
    } else {
      const progressCallback = (
        step: string,
        current: number,
        stepTotal: number
      ) => {
        const inner =
          stepTotal > 0 ? Math.min(1, Math.max(0, current / stepTotal)) : 0;
        const progress = Math.min(90, Math.floor(5 + inner * 85));
        post({ type: 'progress', id, step, progress });
      };

      progressCallback('Starting conversion...', 0, 1);
      const data = importConversation(json, progressCallback);
      post({ type: 'progress', id, step: 'Finalizing...', progress: 92 });
      const result = toCloneable({ type: 'single' as const, data });
      post({ type: 'success', id, result });
    }
  } catch (err) {
    try {
      post({
        type: 'error',
        id,
        error:
          err instanceof Error ? err.message : 'Failed to process import file',
      });
    } catch {
      // Last resort: nothing more we can report to the main thread.
    }
  }
};
