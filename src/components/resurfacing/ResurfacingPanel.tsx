import { useState, useEffect } from 'react';
import { useNoteStore } from '@/stores/noteStore';
import { aiService, type RelatedNote } from '@/services/aiService';
import type { Note } from '@/types/note';

interface ResurfacingPanelProps {
  currentNote: Note;
}

export function ResurfacingPanel({ currentNote }: ResurfacingPanelProps) {
  const notes = useNoteStore((s) => s.notes);
  const setActiveNote = useNoteStore((s) => s.setActiveNote);
  const [relatedNotes, setRelatedNotes] = useState<RelatedNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const findRelated = async () => {
      if (!currentNote.content || currentNote.content.length < 50) {
        setRelatedNotes([]);
        return;
      }

      setIsLoading(true);
      try {
        const related = await aiService.findRelatedNotes(
          {
            title: currentNote.title,
            content: currentNote.content,
            tags: [...currentNote.tags, ...(currentNote.autoTags ?? [])],
          },
          notes.filter(n => n.id !== currentNote.id).map(n => ({
            id: n.id,
            title: n.title,
            content: n.content,
            tags: [...n.tags, ...(n.autoTags ?? [])],
            createdAt: n.createdAt,
          }))
        );
        setRelatedNotes(related.sort((a, b) => b.relevanceScore - a.relevanceScore));
      } catch (err) {
        console.error('Failed to find related notes:', err);
        setRelatedNotes([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce the search
    const timer = setTimeout(findRelated, 2000);
    return () => clearTimeout(timer);
  }, [currentNote.content, currentNote.title, currentNote.id, notes]);

  if (!isExpanded) {
    return (
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => setIsExpanded(true)}
          className="px-3 py-2 bg-[#1a0f0a]/90 border-2 border-[#d4a574]/50 rounded-lg text-[#d4a574] hover:bg-[#2d1f14] transition-colors text-xs font-serif"
          title="Show related notes"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-4 right-4 w-80 max-h-[80vh] overflow-hidden bg-[#1a0f0a]/95 border-2 border-[#d4a574] rounded-lg shadow-2xl z-10">
      <div className="bg-gradient-to-r from-[#2d1f14] to-[#1a0f0a] px-4 py-3 flex items-center justify-between border-b border-[#d4a574]/30">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[#d4a574]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h3 className="text-[#e8dcc4] font-serif font-bold text-sm">
            Smart Resurfacing
          </h3>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-[#d4a574] hover:text-[#e8dcc4] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="overflow-y-auto max-h-[calc(80vh-60px)]">
        {isLoading ? (
          <div className="p-4 text-center text-[#8b7355] text-xs">
            <div className="animate-pulse">Discovering related notes...</div>
          </div>
        ) : relatedNotes.length === 0 ? (
          <div className="p-4 text-center text-[#8b7355] text-xs">
            <p className="italic">No related old notes found yet.</p>
            <p className="mt-2 text-[10px]">Keep writing to discover connections.</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            <p className="text-[10px] text-[#8b7355] italic mb-3">
              {relatedNotes.length} related note{relatedNotes.length !== 1 ? 's' : ''} from your past
            </p>
            {relatedNotes.map((related) => {
              const note = notes.find(n => n.id === related.noteId);
              if (!note) return null;

              const relationshipColors = {
                supporting: 'bg-green-900/20 border-green-700/50 text-green-300',
                contradicting: 'bg-red-900/20 border-red-700/50 text-red-300',
                expanding: 'bg-blue-900/20 border-blue-700/50 text-blue-300',
                related: 'bg-[#d4a574]/20 border-[#d4a574]/50 text-[#d4a574]',
              };

              const relationshipIcons = {
                supporting: '✓',
                contradicting: '✗',
                expanding: '+',
                related: '~',
              };

              return (
                <button
                  key={related.noteId}
                  onClick={() => setActiveNote(related.noteId)}
                  className="w-full text-left p-3 bg-[#2d1f14] hover:bg-[#3d2f24] border border-[#d4a574]/30 rounded transition-all group"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[#e8dcc4] truncate group-hover:text-[#d4a574] transition-colors">
                        {note.title}
                      </div>
                      <div className="text-[10px] text-[#8b7355] mt-0.5">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className={`flex-shrink-0 ml-2 px-2 py-0.5 rounded text-[10px] border ${relationshipColors[related.relationship]}`}>
                      {relationshipIcons[related.relationship]} {related.relationship}
                    </div>
                  </div>

                  <div className="text-[10px] text-[#b8a890] mt-2 line-clamp-2">
                    {related.reason}
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-1 flex-wrap">
                      {note.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="text-[9px] px-1.5 py-0.5 bg-[#d4a574]/10 text-[#d4a574] rounded border border-[#d4a574]/20"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <div className="text-[10px] font-semibold text-[#d4a574]">
                      {related.relevanceScore}%
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-2 border-t border-[#d4a574]/30 bg-[#2d1f14]/50">
        <p className="text-[9px] text-[#8b7355] italic text-center">
          Notes older than 7 days • Updates automatically as you write
        </p>
      </div>
    </div>
  );
}
