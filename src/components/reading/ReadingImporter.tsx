import { useState } from 'react';
import { useNoteStore } from '@/stores/noteStore';
import { aiService, type ExtractedContent } from '@/services/aiService';
import { Button } from '@/components/common';

export function ReadingImporter() {
  const notes = useNoteStore((s) => s.notes);
  const createNote = useNoteStore((s) => s.createNote);
  const setActiveNote = useNoteStore((s) => s.setActiveNote);
  const setView = useNoteStore((s) => s.setView);

  const [inputType, setInputType] = useState<'text' | 'url'>('text');
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExtract = async () => {
    if (!input.trim()) return;

    setIsProcessing(true);
    setError(null);
    setExtracted(null);

    try {
      const result = await aiService.extractContent(
        input.trim(),
        inputType,
        notes.map(n => ({
          id: n.id,
          title: n.title,
          content: n.content,
          tags: [...n.tags, ...(n.autoTags ?? [])],
        }))
      );
      setExtracted(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateNote = async () => {
    if (!extracted) return;

    try {
      // Build content with auto-links
      const linkedNotesSection = extracted.linkedNoteIds.length > 0
        ? [
            '',
            '---',
            '**Related Notes:**',
            ...extracted.linkedNoteIds.map(id => {
              const note = notes.find(n => n.id === id);
              return note ? `- [[${note.title}]]` : '';
            }).filter(Boolean),
          ].join('\n')
        : '';

      const keyPointsSection = extracted.keyPoints.length > 0
        ? [
            '',
            '## Key Points',
            ...extracted.keyPoints.map(point => `- ${point}`),
          ].join('\n')
        : '';

      const fullContent = [
        extracted.summary,
        keyPointsSection,
        linkedNotesSection,
      ].filter(Boolean).join('\n\n');

      const newNote = await createNote({
        title: extracted.title,
        content: fullContent,
        tags: [...extracted.suggestedTags, 'imported'],
      });

      setActiveNote(newNote.id);
      setView('editor');

      // Reset form
      setInput('');
      setExtracted(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0f0a07]">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b-2 border-[#d4a574]/50 bg-gradient-to-b from-[#2d1f14]/30 to-transparent">
        <h2 className="text-xl font-serif font-bold text-[#e8dcc4]">
          <span className="text-[#d4a574]">Reading</span> Integration
        </h2>
        <p className="text-sm text-[#b8a890] mt-1">
          Import content with automatic linking to your notes
        </p>
      </div>

      {/* Input Form */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-[#d4a574]/30 space-y-4">
        {/* Type Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setInputType('text')}
            className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
              inputType === 'text'
                ? 'bg-[#d4a574] text-[#1a0f0a]'
                : 'bg-[#2d1f14] text-[#d4a574] border border-[#d4a574]/30 hover:bg-[#3d2f24]'
            }`}
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Paste Text
          </button>
          <button
            onClick={() => setInputType('url')}
            className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
              inputType === 'url'
                ? 'bg-[#d4a574] text-[#1a0f0a]'
                : 'bg-[#2d1f14] text-[#d4a574] border border-[#d4a574]/30 hover:bg-[#3d2f24]'
            }`}
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            URL
          </button>
        </div>

        {/* Input Area */}
        <div>
          <label className="block text-xs font-semibold text-[#d4a574] mb-2">
            {inputType === 'text' ? 'Paste article, highlights, or notes:' : 'Enter article URL:'}
          </label>
          {inputType === 'text' ? (
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your content here..."
              rows={8}
              className="w-full px-4 py-3 bg-[#2d1f14] border border-[#d4a574]/30 rounded text-[#e8dcc4] placeholder-[#8b7355] focus:outline-none focus:border-[#d4a574] transition-colors font-serif text-sm"
            />
          ) : (
            <input
              type="url"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full px-4 py-3 bg-[#2d1f14] border border-[#d4a574]/30 rounded text-[#e8dcc4] placeholder-[#8b7355] focus:outline-none focus:border-[#d4a574] transition-colors font-serif text-sm"
            />
          )}
        </div>

        <Button
          onClick={handleExtract}
          variant="primary"
          size="sm"
          loading={isProcessing}
          disabled={!input.trim() || isProcessing}
          className="w-full"
        >
          {isProcessing ? 'Analyzing...' : 'Extract & Link'}
        </Button>

        {error && (
          <div className="p-3 bg-red-900/20 border border-red-500/50 rounded text-red-200 text-xs">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {extracted ? (
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-[#d4a574] mb-2">
                Extracted Title:
              </label>
              <div className="text-lg font-serif font-bold text-[#e8dcc4]">
                {extracted.title}
              </div>
            </div>

            {/* Summary */}
            <div>
              <label className="block text-xs font-semibold text-[#d4a574] mb-2">
                Summary:
              </label>
              <div className="text-sm text-[#b8a890] leading-relaxed">
                {extracted.summary}
              </div>
            </div>

            {/* Key Points */}
            {extracted.keyPoints.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-[#d4a574] mb-2">
                  Key Points ({extracted.keyPoints.length}):
                </label>
                <ul className="space-y-2">
                  {extracted.keyPoints.map((point, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="text-[#d4a574] flex-shrink-0">•</span>
                      <span className="text-sm text-[#e8dcc4]">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggested Tags */}
            {extracted.suggestedTags.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-[#d4a574] mb-2">
                  Suggested Tags:
                </label>
                <div className="flex flex-wrap gap-2">
                  {extracted.suggestedTags.map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-[#d4a574]/20 text-[#d4a574] rounded text-xs border border-[#d4a574]/30"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Linked Notes */}
            {extracted.linkedNoteIds.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-[#d4a574] mb-2">
                  Auto-Linked to Existing Notes ({extracted.linkedNoteIds.length}):
                </label>
                <div className="space-y-2">
                  {extracted.linkedNoteIds.map(noteId => {
                    const note = notes.find(n => n.id === noteId);
                    return note ? (
                      <button
                        key={noteId}
                        onClick={() => {
                          setActiveNote(noteId);
                          setView('editor');
                        }}
                        className="w-full text-left px-3 py-2 bg-[#2d1f14] hover:bg-[#3d2f24] border border-[#d4a574]/30 rounded transition-colors"
                      >
                        <div className="text-sm font-medium text-[#e8dcc4]">
                          {note.title}
                        </div>
                        <div className="text-xs text-[#8b7355] mt-1 flex gap-1 flex-wrap">
                          {note.tags.slice(0, 3).map(tag => (
                            <span key={tag}>#{tag}</span>
                          ))}
                        </div>
                      </button>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* Create Note Button */}
            <div className="pt-4 border-t border-[#d4a574]/30">
              <Button
                onClick={handleCreateNote}
                variant="primary"
                size="md"
                className="w-full"
              >
                Create Note with Auto-Links
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-[#8b7355]">
              <svg className="w-16 h-16 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p className="text-sm mt-2">Paste content or enter URL to get started</p>
              <p className="text-xs text-[#6b5945] mt-2">
                AI will extract key points and link to your existing notes
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
