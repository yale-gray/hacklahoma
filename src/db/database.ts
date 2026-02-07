import Dexie, { type Table } from 'dexie';
import type { Note, NoteLink } from '@/types/index.ts';

export class NeuralZettelkastenDB extends Dexie {
  notes!: Table<Note, string>;
  noteLinks!: Table<NoteLink, [string, string]>;

  constructor() {
    super('NeuralZettelkastenDB');

    this.version(1).stores({
      notes: 'id, title, *tags, createdAt, modifiedAt',
      noteLinks: '[sourceId+targetId], sourceId, targetId',
    });
  }
}

export const db = new NeuralZettelkastenDB();
