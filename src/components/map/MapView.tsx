import { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useNoteStore } from '@/stores/noteStore';
import { useUIStore } from '@/stores/uiStore';
import { computeChapters } from '@/services/chapterService';
import { db } from '@/db/database';
import type { NoteLink } from '@/types/note';
import type { Chapter } from '@/types/chapter';
import { SynthesisPanel } from './SynthesisPanel';

interface GraphNode {
  id: string;
  label: string;
  type: 'note' | 'chapter';
  noteCount?: number;
  tags?: string[];
  modifiedAt?: Date;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphLink {
  source: string;
  target: string;
  type: 'wiki' | 'chapter-to-note' | 'shared-tag';
  label?: string;
}

export function MapView() {
  const notes = useNoteStore((s) => s.notes);
  const setActiveNote = useNoteStore((s) => s.setActiveNote);
  const setView = useUIStore((s) => s.setView);
  const groupingMinSize = useUIStore((s) => s.groupingMinSize);
  const graphRef = useRef<any>(null);
  const [noteLinks, setNoteLinks] = useState<NoteLink[]>([]);
  const [showTagLinks, setShowTagLinks] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);

  // Load note links from database
  useEffect(() => {
    const loadLinks = async () => {
      const links = await db.noteLinks.toArray();
      setNoteLinks(links);
    };
    loadLinks();
  }, [notes]);

  // Compute graph data
  const graphData = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    // Add note nodes
    for (const note of notes) {
      nodes.push({
        id: note.id,
        label: note.title,
        type: 'note',
        tags: [...note.tags, ...(note.autoTags ?? [])],
        modifiedAt: note.modifiedAt,
      });
    }

    // Add chapter nodes
    const chapters = computeChapters(notes, groupingMinSize);
    for (const chapter of chapters) {
      const chapterId = `chapter:${chapter.tag}`;
      nodes.push({
        id: chapterId,
        label: chapter.tag,
        type: 'chapter',
        noteCount: chapter.count,
      });

      // Link chapter to its notes
      for (const noteId of chapter.noteIds) {
        links.push({
          source: chapterId,
          target: noteId,
          type: 'chapter-to-note',
          label: `#${chapter.tag}`,
        });
      }
    }

    // Add wiki links
    for (const link of noteLinks) {
      links.push({
        source: link.sourceId,
        target: link.targetId,
        type: 'wiki',
        label: 'Wiki link',
      });
    }

    // Add direct tag links between notes (if enabled)
    if (showTagLinks) {
      const notePairToTags = new Map<string, string[]>();
      const tagToNotes = new Map<string, string[]>();

      for (const note of notes) {
        const allTags = [...note.tags, ...(note.autoTags ?? [])];
        for (const tag of allTags) {
          if (!tagToNotes.has(tag)) {
            tagToNotes.set(tag, []);
          }
          tagToNotes.get(tag)!.push(note.id);
        }
      }

      for (const [tag, noteIds] of tagToNotes.entries()) {
        if (noteIds.length >= 2) {
          for (let i = 0; i < noteIds.length; i++) {
            for (let j = i + 1; j < noteIds.length; j++) {
              const pairKey = [noteIds[i], noteIds[j]].sort().join('|');
              if (!notePairToTags.has(pairKey)) {
                notePairToTags.set(pairKey, []);
              }
              notePairToTags.get(pairKey)!.push(tag);
            }
          }
        }
      }

      for (const [pairKey, tags] of notePairToTags.entries()) {
        const [source, target] = pairKey.split('|');
        const tagLabel = tags.map(t => `#${t}`).join(', ');
        links.push({
          source,
          target,
          type: 'shared-tag',
          label: tagLabel,
        });
      }
    }

    return { nodes, links };
  }, [notes, noteLinks, groupingMinSize, showTagLinks]);

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      if (node.type === 'note') {
        setActiveNote(node.id);
        setView('editor');
      } else if (node.type === 'chapter') {
        // When clicking a chapter, show synthesis panel and zoom to it
        const chapters = computeChapters(notes, groupingMinSize);
        const chapter = chapters.find(c => `chapter:${c.tag}` === node.id);
        if (chapter) {
          setSelectedChapter(chapter);
        }

        const graph = graphRef.current;
        if (graph) {
          // Get the chapter's connected notes
          const chapterId = node.id;
          const connectedNodes = graphData.nodes.filter((n: GraphNode) => {
            if (n.id === chapterId) return true;
            // Check if this note has a link to the chapter
            return graphData.links.some((link: GraphLink) =>
              (link.source === chapterId && link.target === n.id) ||
              (link.target === chapterId && link.source === n.id)
            );
          });

          // Focus on the chapter node
          if (connectedNodes.length > 0) {
            graph.centerAt(node.x, node.y, 400);
            graph.zoom(2, 400);
          }
        }
      }
    },
    [setActiveNote, setView, graphData, notes, groupingMinSize]
  );

  // Double-click to unpin a node
  const handleNodeRightClick = useCallback((node: any) => {
    // Release the node from fixed position
    node.fx = undefined;
    node.fy = undefined;
  }, []);

  const getNodeColor = useCallback((node: GraphNode) => {
    if (node.type === 'chapter') {
      return '#d4a574'; // Gold/brass
    }

    // Check if recently edited (last 24 hours)
    if (node.modifiedAt) {
      const hoursSinceEdit = (Date.now() - node.modifiedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceEdit < 24) {
        return '#ff6b6b'; // Red for recent
      }
    }

    return '#e8dcc4'; // Parchment
  }, []);

  const getNodeSize = useCallback((node: GraphNode) => {
    if (node.type === 'chapter') {
      return Math.sqrt((node.noteCount ?? 5) * 2) + 5;
    }
    return 5;
  }, []);

  const getLinkColor = useCallback((link: GraphLink) => {
    if (link.type === 'wiki') {
      return 'rgba(212, 165, 116, 0.6)'; // Gold
    }
    if (link.type === 'shared-tag') {
      return 'rgba(139, 115, 85, 0.3)'; // Brown/copper
    }
    return 'rgba(232, 220, 196, 0.15)'; // Faint
  }, []);

  const getLinkWidth = useCallback((link: GraphLink) => {
    if (link.type === 'wiki') return 2.5;
    if (link.type === 'shared-tag') return 1.5;
    return 1;
  }, []);

  return (
    <div
      className="w-full h-full relative"
      style={{
        background: 'linear-gradient(135deg, #1a0f0a 0%, #2d1f14 50%, #1a0f0a 100%)'
      }}
    >
      {/* Parchment texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' /%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Aged paper stains */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-64 h-64 rounded-full blur-3xl opacity-10"
          style={{
            background: '#8b7355',
            top: '10%',
            left: '20%',
          }}
        />
        <div
          className="absolute w-48 h-48 rounded-full blur-3xl opacity-10"
          style={{
            background: '#d4a574',
            bottom: '20%',
            right: '15%',
          }}
        />
        <div
          className="absolute w-32 h-32 rounded-full blur-3xl opacity-5"
          style={{
            background: '#8b7355',
            top: '50%',
            right: '40%',
          }}
        />
      </div>

      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        nodeLabel={(node: any) => node.label}
        nodeColor={getNodeColor}
        nodeVal={getNodeSize}
        linkLabel={(link: any) => link.label || ''}
        linkColor={getLinkColor}
        linkWidth={getLinkWidth}
        onNodeClick={handleNodeClick}
        onNodeRightClick={handleNodeRightClick}
        onNodeHover={(node: any) => {
          if (node) {
            document.body.style.cursor = 'move';
          } else {
            document.body.style.cursor = 'default';
          }
        }}
        onNodeDrag={(node: any) => {
          // Allow dragging by updating position
          node.fx = node.x;
          node.fy = node.y;
        }}
        onNodeDragEnd={(node: any) => {
          // Fix position after drag
          node.fx = node.x;
          node.fy = node.y;
        }}
        backgroundColor="transparent"
        linkDirectionalParticles={(link: any) => (link.type === 'wiki' ? 2 : 0)}
        linkDirectionalParticleWidth={2}
        cooldownTicks={50}
        warmupTicks={50}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        d3VelocityDecay={0.3}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.label;
          const fontSize = node.type === 'chapter' ? 14 / globalScale : 10 / globalScale;
          const nodeColor = getNodeColor(node);

          // Draw node circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, getNodeSize(node), 0, 2 * Math.PI, false);
          ctx.fillStyle = nodeColor;
          ctx.fill();

          // Draw glow for recently edited notes
          if (node.type === 'note' && node.modifiedAt) {
            const hoursSinceEdit = (Date.now() - node.modifiedAt.getTime()) / (1000 * 60 * 60);
            if (hoursSinceEdit < 24) {
              ctx.shadowColor = nodeColor;
              ctx.shadowBlur = 15;
              ctx.beginPath();
              ctx.arc(node.x, node.y, getNodeSize(node) + 3, 0, 2 * Math.PI, false);
              ctx.fillStyle = `${nodeColor}33`;
              ctx.fill();
              ctx.shadowBlur = 0;
            }
          }

          // Draw label
          ctx.font = `${fontSize}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#e8dcc4';
          ctx.fillText(label, node.x, node.y + getNodeSize(node) + fontSize + 2);
        }}
      />

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-[#1a0f0a]/90 rounded-lg p-3 shadow-lg backdrop-blur-sm border-2 border-[#d4a574]/50">
        <h3 className="text-sm font-serif font-bold mb-2 text-[#e8dcc4]">
          The Marauder's Map
        </h3>
        <div className="flex flex-col gap-1.5 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: '#d4a574' }} />
            <span className="text-[#d4a574]">Chapters (tag hubs)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: '#e8dcc4' }} />
            <span className="text-[#e8dcc4]">Notes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: '#ff6b6b' }} />
            <span className="text-[#d4a574]">Recently edited</span>
          </div>
          <div className="mt-2 pt-2 border-t border-[#d4a574]/50">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-0.5" style={{ background: 'rgba(212, 165, 116, 0.6)' }} />
              <span className="text-[#d4a574]">Wiki links</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-0.5" style={{ background: 'rgba(139, 115, 85, 0.3)' }} />
              <span className="text-[#d4a574]">Shared tags</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5" style={{ background: 'rgba(232, 220, 196, 0.15)' }} />
              <span className="text-[#d4a574]">Chapter links</span>
            </div>
          </div>
        </div>
        <p className="text-xs italic mt-2 text-[#d4a574]/80" style={{ fontFamily: 'serif' }}>
          Click notes to open • Click chapters to zoom
        </p>
        <p className="text-xs italic mt-1 text-[#d4a574]/60" style={{ fontFamily: 'serif' }}>
          Drag nodes to move • Right-click to unpin • Scroll to zoom
        </p>
      </div>

      {/* Toggle for tag links */}
      <div className="absolute top-4 right-4 bg-[#1a0f0a]/90 rounded-lg p-3 shadow-lg backdrop-blur-sm border-2 border-[#d4a574]/50">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showTagLinks}
            onChange={(e) => setShowTagLinks(e.target.checked)}
            className="w-4 h-4 rounded border-[#d4a574] text-[#d4a574] focus:ring-[#d4a574] focus:ring-offset-0"
          />
          <span className="text-xs text-[#e8dcc4]">
            Show tag connections
          </span>
        </label>
        <p className="text-xs text-[#d4a574]/80 mt-1 italic" style={{ fontFamily: 'serif' }}>
          Direct links between notes with shared tags
        </p>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => {
            const graph = graphRef.current;
            if (graph) {
              const currentZoom = graph.zoom();
              graph.zoom(currentZoom * 1.3, 400);
            }
          }}
          className="w-10 h-10 bg-[#1a0f0a]/90 rounded-lg shadow-lg backdrop-blur-sm border-2 border-[#d4a574]/50 flex items-center justify-center text-[#d4a574] hover:bg-[#2d1f14] transition-colors"
          title="Zoom In"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button
          onClick={() => {
            const graph = graphRef.current;
            if (graph) {
              const currentZoom = graph.zoom();
              graph.zoom(currentZoom / 1.3, 400);
            }
          }}
          className="w-10 h-10 bg-[#1a0f0a]/90 rounded-lg shadow-lg backdrop-blur-sm border-2 border-[#d4a574]/50 flex items-center justify-center text-[#d4a574] hover:bg-[#2d1f14] transition-colors"
          title="Zoom Out"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={() => {
            const graph = graphRef.current;
            if (graph) {
              graph.zoomToFit(400, 50);
            }
          }}
          className="w-10 h-10 bg-[#1a0f0a]/90 rounded-lg shadow-lg backdrop-blur-sm border-2 border-[#d4a574]/50 flex items-center justify-center text-[#d4a574] hover:bg-[#2d1f14] transition-colors"
          title="Reset View"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>

      {/* AI Synthesis Panel */}
      <SynthesisPanel
        chapter={selectedChapter}
        onClose={() => setSelectedChapter(null)}
        onNoteCreated={(noteId) => {
          setSelectedChapter(null);
          setActiveNote(noteId);
          setView('editor');
        }}
      />
    </div>
  );
}
