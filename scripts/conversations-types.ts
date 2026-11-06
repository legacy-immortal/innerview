// Generated TypeScript types from JSON structure

export interface Fragmentsitem {
  type: string;
  content: string;
}

export interface Message {
  files: any[];
  model: string;
  inserted_at: string;
  fragments: Fragmentsitem[];
}

export interface Mappingvalue {
  id: string;
  parent: string;
  children: string[];
  message: Message;
}

export interface Conversationdataitem {
  id: string;
  title: string;
  inserted_at: string;
  updated_at: string;
  mapping: Record<string | number, Mappingvalue>;
}

export type ConversationData = Conversationdataitem[];
