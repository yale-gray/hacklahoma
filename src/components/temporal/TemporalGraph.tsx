import { useMemo, useState } from 'react';
import { useNoteStore } from '@/stores/noteStore';
import type { Note } from '@/types/note';

interface TimeBlock {
  period: string;
  startDate: Date;
  endDate: Date;
  notes: Note[];
  topTags: Array<{ tag: string; count: number }>;
}

type TimeGrouping = 'day' | 'week' | 'month';

export function TemporalGraph() {
  const notes = useNoteStore((s) => s.notes);
  const setActiveNote = useNoteStore((s) => s.setActiveNote);
  const [grouping, setGrouping] = useState<TimeGrouping>('week');
  const [selectedBlock, setSelectedBlock] = useState<TimeBlock | null>(null);

  const timeBlocks = useMemo(() => {
    if (notes.length === 0) return [];

    // Sort notes by creation date
    const sortedNotes = [...notes].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const blocks = new Map<string, TimeBlock>();

    sortedNotes.forEach(note => {
      const date = new Date(note.createdAt);
      let periodKey: string;
      let startDate: Date;
      let endDate: Date;

      if (grouping === 'day') {
        periodKey = date.toISOString().split('T')[0];
        startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
      } else if (grouping === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        periodKey = weekStart.toISOString().split('T')[0];
        startDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
        endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      } else {
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        startDate = new Date(date.getFullYear(), date.getMonth(), 1);
        endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      }

      if (!blocks.has(periodKey)) {
        blocks.set(periodKey, {
          period: periodKey,
          startDate,
          endDate,
          notes: [],
          topTags: [],
        });
      }

      blocks.get(periodKey)!.notes.push(note);
    });

    // Calculate top tags for each block
    blocks.forEach(block => {
      const tagCounts = new Map<string, number>();
      block.notes.forEach(note => {
        const allTags = [...note.tags, ...(note.autoTags ?? [])];
        allTags.forEach(tag => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      });

      block.topTags = [...tagCounts.entries()]
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    });

    return Array.from(blocks.values());
  }, [notes, grouping]);

  const formatPeriod = (block: TimeBlock) => {
    const start = block.startDate;
    if (grouping === 'day') {
      return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } else if (grouping === 'week') {
      return `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else {
      return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  const maxNotes = Math.max(...timeBlocks.map(b => b.notes.length), 1);

  return (
    <div className="flex flex-col h-full bg-[#0f0a07]">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b-2 border-[#d4a574]/50 bg-gradient-to-b from-[#2d1f14]/30 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-serif font-bold text-[#e8dcc4]">
              <span className="text-[#d4a574]">Temporal</span> Knowledge Graph
            </h2>
            <p className="text-sm text-[#b8a890] mt-1">
              View how your knowledge evolved over time
            </p>
          </div>
          <div className="flex gap-1">
            {(['day', 'week', 'month'] as TimeGrouping[]).map(g => (
              <button
                key={g}
                onClick={() => setGrouping(g)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  grouping === g
                    ? 'bg-[#d4a574] text-[#1a0f0a]'
                    : 'text-[#d4a574] hover:text-[#e8dcc4] hover:bg-[#2d1f14]'
                }`}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {timeBlocks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-[#8b7355]">
              <svg className="w-16 h-16 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm mt-2">No notes yet</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {timeBlocks.map((block, idx) => {
              const heightPercent = (block.notes.length / maxNotes) * 100;
              const isSelected = selectedBlock?.period === block.period;

              return (
                <div key={block.period} className="relative">
                  {/* Timeline connector */}
                  {idx < timeBlocks.length - 1 && (
                    <div className="absolute left-4 top-full h-6 w-0.5 bg-[#d4a574]/30" />
                  )}

                  <div
                    className={`relative flex gap-4 cursor-pointer transition-all ${
                      isSelected ? 'scale-[1.02]' : 'hover:scale-[1.01]'
                    }`}
                    onClick={() => setSelectedBlock(isSelected ? null : block)}
                  >
                    {/* Timeline dot */}
                    <div className="flex-shrink-0 pt-1">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? 'bg-[#d4a574] border-[#d4a574]'
                          : 'bg-[#2d1f14] border-[#d4a574]'
                      }`}>
                        <span className={`text-xs font-bold ${
                          isSelected ? 'text-[#1a0f0a]' : 'text-[#d4a574]'
                        }`}>
                          {block.notes.length}
                        </span>
                      </div>
                    </div>

                    {/* Block content */}
                    <div className={`flex-1 pb-2 border-2 rounded-lg p-4 transition-all ${
                      isSelected
                        ? 'bg-[#2d1f14] border-[#d4a574]'
                        : 'bg-[#1a0f0a] border-[#d4a574]/30 hover:border-[#d4a574]/60'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-[#e8dcc4] font-serif font-semibold">
                            {formatPeriod(block)}
                          </h3>
                          <p className="text-xs text-[#8b7355] mt-1">
                            {block.notes.length} note{block.notes.length !== 1 ? 's' : ''} created
                          </p>
                        </div>
                        <div
                          className="w-20 bg-[#0f0a07] rounded overflow-hidden border border-[#d4a574]/30"
                          style={{ height: '40px' }}
                        >
                          <div
                            className="bg-gradient-to-t from-[#d4a574] to-[#d4a574]/50 transition-all"
                            style={{ height: `${heightPercent}%`, minHeight: '4px' }}
                          />
                        </div>
                      </div>

                      {/* Top tags */}
                      {block.topTags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {block.topTags.map(({ tag, count }) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-[#d4a574]/20 text-[#d4a574] rounded text-xs border border-[#d4a574]/30"
                            >
                              #{tag} ({count})
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Expanded notes list */}
                      {isSelected && (
                        <div className="mt-4 pt-4 border-t border-[#d4a574]/30 space-y-2">
                          <h4 className="text-xs font-semibold text-[#b8a890] uppercase">Notes:</h4>
                          {block.notes.map(note => (
                            <button
                              key={note.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveNote(note.id);
                              }}
                              className="block w-full text-left px-3 py-2 bg-[#0f0a07] hover:bg-[#1a0f0a] rounded text-sm text-[#e8dcc4] transition-colors border border-[#d4a574]/20 hover:border-[#d4a574]/50"
                            >
                              <div className="font-medium truncate">{note.title}</div>
                              <div className="text-xs text-[#8b7355] mt-0.5">
                                {new Date(note.createdAt).toLocaleString()}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
