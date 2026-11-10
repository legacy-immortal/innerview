/**
 * @file Web Worker for parsing and converting conversation import files off the main thread.
 * @module lib/conversation-import-worker.ts
 *
 * Streams converted conversations back to the main thread one-by-one to avoid
 * holding and cloning the entire import result at once (which can crash the
 * worker on large imports near finalization).
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

export interface ImportWorkerItem {
  readonly type: 'item';
  readonly id: number;
  readonly index: number;
  readonly data: ImportWorkerResultSingle;
}

export interface ImportWorkerDone {
  readonly type: 'done';
  readonly id: number;
  readonly kind: 'single' | 'multiple';
  readonly count: number;
}

export interface ImportWorkerError {
  readonly type: 'error';
  readonly id: number;
  readonly error: string;
}

export type ImportWorkerResponse =
  | ImportWorkerProgress
  | ImportWorkerItem
  | ImportWorkerDone
  | ImportWorkerError;

function post(msg: ImportWorkerResponse): void {
  self.postMessage(msg);
}

/**
 * Ensure a value is structured-cloneable/plain data before posting it back
 * to the main thread. Some converted payloads can include non-cloneable values
 * (or odd prototypes) which would fail at handoff.
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
      for (let i = 0; i < json.length; i++) {
        const conv = json[i];
        const progressCallback = (
          step: string,
          current: number,
          stepTotal: number
        ) => {
          // Reserve 0-5% for parse/setup, 5-90% for conversion, 90-100% for handoff.
          const convBase = 5 + (i / total) * 85;
          const convSpan = 85 / total;
          const inner =
            stepTotal > 0 ? Math.min(1, Math.max(0, current / stepTotal)) : 0;
          const progress = Math.min(
            90,
            Math.floor(convBase + inner * convSpan)
          );
          // Drop verbose "Conversation:" prefix from step text if present.
          const cleanStep = step.replace(/^Conversation:\s*/i, '');
          post({
            type: 'progress',
            id,
            step: `${i + 1}/${total}: ${cleanStep}`,
            progress,
          });
        };

        progressCallback('Starting...', 0, 1);
        const converted = importConversation(conv, progressCallback);
        // Send each converted conversation immediately to avoid accumulating and
        // cloning the entire result at the end (memory pressure).
        const data = toCloneable(converted);
        post({ type: 'item', id, index: i, data });
      }
      post({ type: 'progress', id, step: 'Finalizing...', progress: 92 });
      post({ type: 'done', id, kind: 'multiple', count: json.length });
    } else {
      const progressCallback = (
        step: string,
        current: number,
        stepTotal: number
      ) => {
        const inner =
          stepTotal > 0 ? Math.min(1, Math.max(0, current / stepTotal)) : 0;
        const progress = Math.min(90, Math.floor(5 + inner * 85));
        const cleanStep = step.replace(/^Conversation:\s*/i, '');
        post({ type: 'progress', id, step: cleanStep, progress });
      };

      progressCallback('Starting conversion...', 0, 1);
      const converted = importConversation(json, progressCallback);
      const data = toCloneable(converted);
      post({ type: 'item', id, index: 0, data });
      post({ type: 'progress', id, step: 'Finalizing...', progress: 92 });
      post({ type: 'done', id, kind: 'single', count: 1 });
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
