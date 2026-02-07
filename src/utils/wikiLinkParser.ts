import type { NoteLink } from '@/types/index.ts';

const WIKI_LINK_REGEX = /\[\[([^\]]+)\]\]/g;

export function extractWikiLinks(noteId: string, content: string): NoteLink[] {
  const links: NoteLink[] = [];
  let match: RegExpExecArray | null;

  while ((match = WIKI_LINK_REGEX.exec(content)) !== null) {
    const targetTitle = match[1].trim();
    const start = Math.max(0, match.index - 50);
    const end = Math.min(content.length, match.index + match[0].length + 50);
    const context = content.slice(start, end);

    links.push({
      sourceId: noteId,
      targetId: targetTitle,
      context,
    });
  }

  return links;
}

export function getWikiLinkTitles(content: string): string[] {
  const titles: string[] = [];
  let match: RegExpExecArray | null;
  const regex = /\[\[([^\]]+)\]\]/g;

  while ((match = regex.exec(content)) !== null) {
    titles.push(match[1].trim());
  }

  return [...new Set(titles)];
}
