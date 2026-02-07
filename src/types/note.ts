export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  embedding?: number[];
  createdAt: Date;
  modifiedAt: Date;
}

export interface NoteLink {
  sourceId: string;
  targetId: string;
  context?: string;
}

export type NoteCreateInput = Pick<Note, 'title' | 'content' | 'tags'>;
export type NoteUpdateInput = Partial<Pick<Note, 'title' | 'content' | 'tags'>>;
