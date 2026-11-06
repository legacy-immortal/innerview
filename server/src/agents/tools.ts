import { tool } from 'langchain';
import { z } from 'zod';
import { knowledgeGraph } from '../memory/knowledge-graph.js';
import { vectorStore } from '../memory/vector-store.js';

/**
 * Tool to recall specific facts or themes from earlier in the conversation
 * Uses vector store similarity search to find relevant memories
 */
export const recallSpecificTool = tool(
  async ({ theme, context }) => {
    const memories = await vectorStore.similaritySearch(theme, 2);
    return memories.length > 0
      ? `Earlier, you spoke of: "${memories[0].pageContent}"... it resonates with ${context}`
      : 'I may have forgotten that particular thread... would you remind me?';
  },
  {
    name: 'recall_specific',
    description:
      'Recall specific facts or themes from earlier in our conversation',
    schema: z.object({
      theme: z.string().describe('The theme or topic to search for'),
      context: z
        .string()
        .describe('The context in which this recall is relevant'),
    }),
  }
);

/**
 * Tool to recall specific entities or facts mentioned earlier in the conversation
 * Uses knowledge graph to query entity relationships
 */
export const recallEntityTool = tool(
  async ({ entity, relation }) => {
    const facts = await knowledgeGraph.query(entity, relation);
    return facts.length > 0
      ? `Earlier you mentioned: ${facts.join('; ')}`
      : "I don't recall specific details about that.";
  },
  {
    name: 'recall_entity',
    description:
      'Recall specific entities or facts mentioned earlier in this conversation',
    schema: z.object({
      entity: z.string().describe('The entity name to search for'),
      relation: z
        .string()
        .optional()
        .describe('Optional relation type to filter by'),
    }),
  }
);
