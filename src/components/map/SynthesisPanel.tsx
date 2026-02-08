import { useState } from 'react';
import { useNoteStore } from '@/stores/noteStore';
import { aiService } from '@/services/aiService';
import { Button } from '@/components/common';
import type { Chapter } from '@/types/chapter';

interface SynthesisPanelProps {
  chapter: Chapter | null;
  onClose: () => void;
  onNoteCreated: (noteId: string) => void;
}

export function SynthesisPanel({ chapter, onClose, onNoteCreated }: SynthesisPanelProps) {
  const notes = useNoteStore((s) => s.notes);
  const createNote = useNoteStore((s) => s.createNote);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!chapter) return null;

  const chapterNotes = notes.filter((n) => chapter.noteIds.includes(n.id));

  const handleSynthesize = async () => {
    setIsSynthesizing(true);
    setError(null);
    try {
      const synthesis = await aiService.synthesizeChapter(
        chapter.tag,
        chapterNotes.map(n => ({ id: n.id, title: n.title, content: n.content }))
      );

      // Create synthesis note with special formatting
      const synthesisContent = [
        synthesis.content,
        '',
        '---',
        '**Source Notes:**',
        ...synthesis.sourceNoteIds.map(id => {
          const note = chapterNotes.find(n => n.id === id);
          return note ? `- [[${note.title}]]` : '';
        }).filter(Boolean),
      ].join('\n');

      const newNote = await createNote({
        title: synthesis.title,
        content: synthesisContent,
        tags: [chapter.tag, 'synthesis', 'ai-generated'],
      });

      onNoteCreated(newNote.id);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to synthesize';
      setError(message);
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div className="absolute top-4 right-4 w-80 bg-[#1a0f0a] border-2 border-[#d4a574] rounded-lg shadow-2xl overflow-hidden z-10">
      <div className="bg-gradient-to-r from-[#2d1f14] to-[#1a0f0a] px-4 py-3 flex items-center justify-between border-b border-[#d4a574]/30">
        <h3 className="text-[#e8dcc4] font-serif font-bold">
          AI Knowledge Synthesis
        </h3>
        <button
          onClick={onClose}
          className="text-[#d4a574] hover:text-[#e8dcc4] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        <div className="text-[#e8dcc4] text-sm">
          <span className="font-semibold text-[#d4a574]">Chapter:</span> #{chapter.tag}
        </div>
        <div className="text-[#e8dcc4] text-sm">
          <span className="font-semibold text-[#d4a574]">Notes:</span> {chapter.count}
        </div>

        <p className="text-[#b8a890] text-xs leading-relaxed">
          AI will analyze all {chapter.count} notes tagged with <span className="text-[#d4a574]">#{chapter.tag}</span> to create a synthesized meta-note that reveals patterns, connections, and emergent insights.
        </p>

        {error && (
          <div className="p-3 bg-red-900/20 border border-red-500/50 rounded text-red-200 text-xs">
            {error}
          </div>
        )}

        <div className="pt-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSynthesize}
            loading={isSynthesizing}
            className="w-full"
          >
            {isSynthesizing ? 'Synthesizing...' : 'Generate Synthesis'}
          </Button>
        </div>

        <div className="text-[#8b7355] text-xs">
          <strong>Preview notes:</strong>
          <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
            {chapterNotes.slice(0, 5).map(note => (
              <div key={note.id} className="text-[#b8a890] truncate">
                • {note.title}
              </div>
            ))}
            {chapterNotes.length > 5 && (
              <div className="text-[#8b7355] italic">
                +{chapterNotes.length - 5} more...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
