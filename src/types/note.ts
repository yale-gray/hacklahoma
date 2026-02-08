export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  autoTags?: string[];
  summary?: string;
  embedding?: number[];
  bookColor?: number; // 0-5 for color variations
  createdAt: Date;
  modifiedAt: Date;
}

export interface NoteLink {
  sourceId: string;
  targetId: string;
  context?: string;
}

export interface CitedNote {
  index: number;
  id: string;
  title: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  citedNotes?: CitedNote[];
}

export interface SavedChat {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  modifiedAt: Date;
}

export type NoteCreateInput = Pick<Note, 'title' | 'content' | 'tags'>;
export type NoteUpdateInput = Partial<Pick<Note, 'title' | 'content' | 'tags' | 'bookColor'>>;
