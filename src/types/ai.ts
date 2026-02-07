export interface Suggestion {
  noteId: string;
  targetNoteId: string;
  similarity: number;
  reason: string;
}

export interface Insight {
  type: 'theme' | 'gap' | 'bridge';
  title: string;
  description: string;
  relatedNotes: string[];
}
