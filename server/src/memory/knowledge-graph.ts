// Knowledge graph for entity-relationship memory
// This is a placeholder - would integrate with Neo4j in production

interface Entity {
  id: string;
  name: string;
  type: string;
}

interface Relationship {
  from: string;
  to: string;
  type: string;
  context?: string;
}

class InMemoryKnowledgeGraph {
  private entities: Map<string, Entity> = new Map();
  // Secondary index: lowercase name -> entity id, so query() is O(1)
  // instead of scanning every entity on each recall.
  private nameIndex: Map<string, string> = new Map();
  private relationships: Relationship[] = [];
  private queryCache: Map<string, string[]> = new Map();

  async addEntity(entity: Entity): Promise<void> {
    const previous = this.entities.get(entity.id);
    if (previous && previous.name.toLowerCase() !== entity.name.toLowerCase()) {
      this.nameIndex.delete(previous.name.toLowerCase());
    }
    this.entities.set(entity.id, entity);
    this.nameIndex.set(entity.name.toLowerCase(), entity.id);
    this.queryCache.clear();
  }

  async addRelationship(relationship: Relationship): Promise<void> {
    this.relationships.push(relationship);
    this.queryCache.clear();
  }

  async query(
    entityName: string,
    relationshipType?: string
  ): Promise<string[]> {
    const cacheKey = `${entityName.toLowerCase()}\n${relationshipType ?? ''}`;
    const cachedQuery = this.queryCache.get(cacheKey);
    if (cachedQuery) return [...cachedQuery];

    const entityId = this.nameIndex.get(entityName.toLowerCase());
    const entity = entityId ? this.entities.get(entityId) : undefined;

    if (!entity) return [];

    const related = this.relationships
      .filter((rel) => {
        if (relationshipType) {
          return (
            (rel.from === entity.id || rel.to === entity.id) &&
            rel.type === relationshipType
          );
        }
        return rel.from === entity.id || rel.to === entity.id;
      })
      .map((rel) => {
        const otherId = rel.from === entity.id ? rel.to : rel.from;
        const otherEntity = this.entities.get(otherId);
        return rel.context || `${rel.type}: ${otherEntity?.name || otherId}`;
      });

    if (this.queryCache.size >= 512) this.queryCache.clear();
    this.queryCache.set(cacheKey, related);
    return related;
  }

  async extractEntities(_text: string): Promise<Entity[]> {
    // Placeholder for entity extraction
    // In production, would use NER model
    return [];
  }
}

export const knowledgeGraph = new InMemoryKnowledgeGraph();
