import Dexie, { type Table } from 'dexie';
import type { Note, NoteLink, SavedChat } from '@/types/index.ts';

export class NeuralZettelkastenDB extends Dexie {
  notes!: Table<Note, string>;
  noteLinks!: Table<NoteLink, [string, string]>;
  chats!: Table<SavedChat, string>;

  constructor() {
    super('NeuralZettelkastenDB');

    this.version(1).stores({
      notes: 'id, title, *tags, createdAt, modifiedAt',
      noteLinks: '[sourceId+targetId], sourceId, targetId',
    });

    this.version(2).stores({
      notes: 'id, title, *tags, createdAt, modifiedAt',
      noteLinks: '[sourceId+targetId], sourceId, targetId',
      chats: 'id, title, createdAt, modifiedAt',
    });
  }
}

export const db = new NeuralZettelkastenDB();
