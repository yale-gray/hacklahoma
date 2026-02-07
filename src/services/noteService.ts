import { db } from '@/db/database.ts';
import type { Note, NoteCreateInput, NoteUpdateInput, NoteLink } from '@/types/index.ts';
import { generateNoteId } from '@/utils/idGenerator.ts';
import { extractWikiLinks } from '@/utils/wikiLinkParser.ts';

async function syncNoteLinks(note: Note): Promise<void> {
  await db.noteLinks.where('sourceId').equals(note.id).delete();

  const rawLinks = extractWikiLinks(note.id, note.content);
  const allNotes = await db.notes.toArray();
  const titleToId = new Map(allNotes.map((n) => [n.title.toLowerCase(), n.id]));

  const resolvedLinks: NoteLink[] = rawLinks
    .map((link) => ({
      ...link,
      targetId: titleToId.get(link.targetId.toLowerCase()) ?? link.targetId,
    }))
    .filter((link) => link.targetId !== note.id);

  if (resolvedLinks.length > 0) {
    await db.noteLinks.bulkPut(resolvedLinks);
  }
}

export const noteService = {
  async create(input: NoteCreateInput): Promise<Note> {
    const now = new Date();
    const note: Note = {
      id: generateNoteId(now),
      title: input.title,
      content: input.content,
      tags: input.tags,
      createdAt: now,
      modifiedAt: now,
    };

    await db.transaction('rw', [db.notes, db.noteLinks], async () => {
      await db.notes.add(note);
      await syncNoteLinks(note);
    });

    return note;
  },

  async update(id: string, input: NoteUpdateInput): Promise<Note | undefined> {
    const existing = await db.notes.get(id);
    if (!existing) return undefined;

    const updated: Note = {
      ...existing,
      ...input,
      modifiedAt: new Date(),
    };

    await db.transaction('rw', [db.notes, db.noteLinks], async () => {
      await db.notes.put(updated);
      await syncNoteLinks(updated);
    });

    return updated;
  },

  async delete(id: string): Promise<void> {
    await db.transaction('rw', [db.notes, db.noteLinks], async () => {
      await db.notes.delete(id);
      await db.noteLinks.where('sourceId').equals(id).delete();
      await db.noteLinks.where('targetId').equals(id).delete();
    });
  },

  async getById(id: string): Promise<Note | undefined> {
    return db.notes.get(id);
  },

  async getAll(): Promise<Note[]> {
    return db.notes.orderBy('modifiedAt').reverse().toArray();
  },

  async search(query: string): Promise<Note[]> {
    const lowerQuery = query.toLowerCase();
    return db.notes
      .filter(
        (note) =>
          note.title.toLowerCase().includes(lowerQuery) ||
          note.content.toLowerCase().includes(lowerQuery) ||
          note.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
      )
      .toArray();
  },

  async getByTag(tag: string): Promise<Note[]> {
    return db.notes.where('tags').equals(tag).toArray();
  },

  async getAllTags(): Promise<string[]> {
    const notes = await db.notes.toArray();
    const tagSet = new Set<string>();
    for (const note of notes) {
      for (const tag of note.tags) {
        tagSet.add(tag);
      }
    }
    return [...tagSet].sort();
  },

  async getBacklinks(noteId: string): Promise<NoteLink[]> {
    return db.noteLinks.where('targetId').equals(noteId).toArray();
  },

  async getForwardLinks(noteId: string): Promise<NoteLink[]> {
    return db.noteLinks.where('sourceId').equals(noteId).toArray();
  },
};
