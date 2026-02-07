import type { Note } from '@/types/note';
import type { Chapter } from '@/types/chapter';

/**
 * Compute chapters (tag groupings) from notes.
 * A chapter is created for each tag that has at least `minSize` notes.
 */
export function computeChapters(notes: Note[], minSize: number = 5): Chapter[] {
  // Count notes per tag
  const tagCounts = new Map<string, string[]>();

  for (const note of notes) {
    const allTags = [...note.tags, ...(note.autoTags ?? [])];
    for (const tag of allTags) {
      if (!tagCounts.has(tag)) {
        tagCounts.set(tag, []);
      }
      tagCounts.get(tag)!.push(note.id);
    }
  }

  // Create chapters for tags with enough notes
  const chapters: Chapter[] = [];
  for (const [tag, noteIds] of tagCounts.entries()) {
    if (noteIds.length >= minSize) {
      chapters.push({
        tag,
        count: noteIds.length,
        noteIds,
      });
    }
  }

  // Sort by count (descending)
  chapters.sort((a, b) => b.count - a.count);

  return chapters;
}
