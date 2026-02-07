import { db } from '@/db/database.ts';
import type { Note, NoteCreateInput, NoteUpdateInput, NoteLink } from '@/types/index.ts';
import { generateNoteId } from '@/utils/idGenerator.ts';
import { extractWikiLinks } from '@/utils/wikiLinkParser.ts';
import { aiService } from '@/services/aiService.ts';

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

async function enrichNoteContent(title: string, content: string): Promise<Pick<Note, 'summary' | 'autoTags'>> {
  const { summary, autoTags } = await aiService.summarizeAndTag(title, content);
  return { summary, autoTags };
}

export const noteService = {
  async create(input: NoteCreateInput): Promise<Note> {
    const now = new Date();
    const enrichment = await enrichNoteContent(input.title, input.content);
    const note: Note = {
      id: generateNoteId(now),
      title: input.title,
      content: input.content,
      tags: input.tags,
      summary: enrichment.summary,
      autoTags: enrichment.autoTags,
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

    const nextTitle = input.title ?? existing.title;
    const nextContent = input.content ?? existing.content;
    const shouldEnrich =
      input.title !== undefined ||
      input.content !== undefined ||
      !existing.summary ||
      !(existing.autoTags && existing.autoTags.length > 0);
    const enrichment = shouldEnrich
      ? await enrichNoteContent(nextTitle, nextContent)
      : { summary: existing.summary, autoTags: existing.autoTags };

    const updated: Note = {
      ...existing,
      ...input,
      summary: enrichment.summary,
      autoTags: enrichment.autoTags,
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
    const notes = await db.notes.orderBy('modifiedAt').reverse().toArray();
    const enriched = await Promise.all(
      notes.map(async (note) => {
        if (note.summary && note.autoTags?.length) {
          return note;
        }
        const enrichment = await enrichNoteContent(note.title, note.content);
        const updated = { ...note, ...enrichment };
        await db.notes.put(updated);
        return updated;
      })
    );
    return enriched;
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
