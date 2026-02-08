import { useState, useEffect } from 'react';
import { useNoteStore } from '@/stores/noteStore';
import { aiService, type ArgumentAnalysis } from '@/services/aiService';

export function ArgumentMapper() {
  const notes = useNoteStore((s) => s.notes);
  const setActiveNote = useNoteStore((s) => s.setActiveNote);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [analysis, setAnalysis] = useState<ArgumentAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get all unique tags with counts
  const tagCounts = new Map<string, number>();
  notes.forEach(note => {
    const allTags = [...note.tags, ...(note.autoTags ?? [])];
    allTags.forEach(tag => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });

  const popularTags = Array.from(tagCounts.entries())
    .filter(([_, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);

  const handleAnalyze = async () => {
    if (!selectedTag) return;

    setIsAnalyzing(true);
    setError(null);
    try {
      const relevantNotes = notes
        .filter(note => {
          const allTags = [...note.tags, ...(note.autoTags ?? [])];
          return allTags.includes(selectedTag);
        })
        .map(note => ({
          id: note.id,
          title: note.title,
          content: note.content,
          createdAt: note.createdAt,
        }));

      if (relevantNotes.length < 3) {
        setError('Need at least 3 notes with this tag to analyze arguments');
        return;
      }

      const result = await aiService.analyzeArguments(selectedTag, relevantNotes);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (selectedTag) {
      handleAnalyze();
    }
  }, [selectedTag]);

  return (
    <div className="flex flex-col h-full bg-[#0f0a07]">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b-2 border-[#d4a574]/50 bg-gradient-to-b from-[#2d1f14]/30 to-transparent">
        <h2 className="text-xl font-serif font-bold text-[#e8dcc4]">
          <span className="text-[#d4a574]">Argument</span> Mapper
        </h2>
        <p className="text-sm text-[#b8a890] mt-1">
          Discover supporting, contradicting, and evolving viewpoints
        </p>
      </div>

      {/* Tag Selector */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-[#d4a574]/30">
        <label className="block text-xs font-semibold text-[#d4a574] mb-2">
          Select Topic to Analyze:
        </label>
        {popularTags.length === 0 ? (
          <p className="text-xs text-[#8b7355] italic">
            Add more notes with tags to enable argument analysis
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {popularTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  selectedTag === tag
                    ? 'bg-[#d4a574] text-[#1a0f0a]'
                    : 'bg-[#2d1f14] text-[#d4a574] border border-[#d4a574]/30 hover:bg-[#3d2f24]'
                }`}
              >
                #{tag} ({tagCounts.get(tag)})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Analysis Results */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {!selectedTag ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-[#8b7355]">
              <svg className="w-16 h-16 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm mt-2">Select a topic to map arguments</p>
            </div>
          </div>
        ) : isAnalyzing ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-[#d4a574]">
              <div className="animate-pulse text-sm">Analyzing arguments...</div>
            </div>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-900/20 border border-red-500/50 rounded text-red-200 text-sm">
            {error}
          </div>
        ) : analysis ? (
          <div className="space-y-6">
            {/* Supporting Notes */}
            <div className="border-2 border-green-700/30 rounded-lg bg-green-900/10 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-green-700/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-green-300 font-serif font-bold">
                  Supporting ({analysis.supportingNotes.length})
                </h3>
              </div>
              <div className="space-y-2">
                {analysis.supportingNotes.map(({ noteId, excerpt }) => {
                  const note = notes.find(n => n.id === noteId);
                  return (
                    <button
                      key={noteId}
                      onClick={() => setActiveNote(noteId)}
                      className="w-full text-left p-3 bg-[#2d1f14] hover:bg-[#3d2f24] border border-green-700/30 rounded transition-colors"
                    >
                      <div className="text-sm font-medium text-[#e8dcc4] mb-1">
                        {note?.title}
                      </div>
                      <div className="text-xs text-[#b8a890] italic line-clamp-2">
                        "{excerpt}"
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contradicting Notes */}
            {analysis.contradictingNotes.length > 0 && (
              <div className="border-2 border-red-700/30 rounded-lg bg-red-900/10 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-red-700/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="text-red-300 font-serif font-bold">
                    Contradicting ({analysis.contradictingNotes.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {analysis.contradictingNotes.map(({ noteId, excerpt }) => {
                    const note = notes.find(n => n.id === noteId);
                    return (
                      <button
                        key={noteId}
                        onClick={() => setActiveNote(noteId)}
                        className="w-full text-left p-3 bg-[#2d1f14] hover:bg-[#3d2f24] border border-red-700/30 rounded transition-colors"
                      >
                        <div className="text-sm font-medium text-[#e8dcc4] mb-1">
                          {note?.title}
                        </div>
                        <div className="text-xs text-[#b8a890] italic line-clamp-2">
                          "{excerpt}"
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Synthesis Notes */}
            {analysis.synthesisNotes.length > 0 && (
              <div className="border-2 border-blue-700/30 rounded-lg bg-blue-900/10 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-blue-700/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h3 className="text-blue-300 font-serif font-bold">
                    Synthesis ({analysis.synthesisNotes.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {analysis.synthesisNotes.map(({ noteId, excerpt }) => {
                    const note = notes.find(n => n.id === noteId);
                    return (
                      <button
                        key={noteId}
                        onClick={() => setActiveNote(noteId)}
                        className="w-full text-left p-3 bg-[#2d1f14] hover:bg-[#3d2f24] border border-blue-700/30 rounded transition-colors"
                      >
                        <div className="text-sm font-medium text-[#e8dcc4] mb-1">
                          {note?.title}
                        </div>
                        <div className="text-xs text-[#b8a890] italic line-clamp-2">
                          "{excerpt}"
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Evolution Timeline */}
            {analysis.evolution.length > 0 && (
              <div className="border-2 border-[#d4a574]/30 rounded-lg bg-[#2d1f14] p-4">
                <h3 className="text-[#d4a574] font-serif font-bold mb-3">
                  Evolution of Thinking
                </h3>
                <div className="space-y-3">
                  {analysis.evolution.map((event, idx) => {
                    const note = notes.find(n => n.id === event.noteId);
                    return (
                      <div key={idx} className="relative pl-6">
                        {idx < analysis.evolution.length - 1 && (
                          <div className="absolute left-2 top-6 w-0.5 h-full bg-[#d4a574]/30" />
                        )}
                        <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-[#d4a574] border-2 border-[#1a0f0a]" />
                        <button
                          onClick={() => setActiveNote(event.noteId)}
                          className="text-left hover:bg-[#3d2f24] p-2 -ml-2 rounded transition-colors w-full"
                        >
                          <div className="text-xs text-[#8b7355]">
                            {new Date(event.date).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-[#e8dcc4] font-medium">
                            {note?.title}
                          </div>
                          <div className="text-xs text-[#b8a890] mt-1">
                            {event.stance}
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
