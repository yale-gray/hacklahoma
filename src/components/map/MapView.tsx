import { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useNoteStore } from '@/stores/noteStore';
import { useUIStore } from '@/stores/uiStore';
import { db } from '@/db/database';
import type { NoteLink } from '@/types/note';

interface GraphNode {
  id: string;
  label: string;
  tagCount: number;
  modifiedAt?: Date;
  clusterColor?: string;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string;
  target: string;
  type: 'tag' | 'wiki';
  sharedTags: string[];
}

// Muted, dark-academia-friendly cluster palette
const CLUSTER_COLORS = [
  '#8b5e3c', // warm umber
  '#6b7f5e', // sage olive
  '#7a5a7a', // dusty plum
  '#5c7a8a', // slate teal
  '#a07850', // antique brass
  '#6a5a4a', // driftwood
  '#7a6050', // clay
  '#5a6a5a', // moss
  '#8a6a6a', // rosewood
  '#5a5a7a', // twilight
];

export function MapView() {
  const notes = useNoteStore((s) => s.notes);
  const setActiveNote = useNoteStore((s) => s.setActiveNote);
  const setView = useUIStore((s) => s.setView);
  const mapColorThreshold = useUIStore((s) => s.mapColorThreshold);
  const hoveredGroupTag = useUIStore((s) => s.hoveredGroupTag);
  const graphRef = useRef<any>(null);
  const [noteLinks, setNoteLinks] = useState<NoteLink[]>([]);

  // Load wiki links from database
  useEffect(() => {
    const loadLinks = async () => {
      const links = await db.noteLinks.toArray();
      setNoteLinks(links);
    };
    loadLinks();
  }, [notes]);

  const graphData = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    // Build tag → noteIds index
    const tagToNotes = new Map<string, string[]>();
    const noteIdSet = new Set<string>();
    for (const note of notes) {
      noteIdSet.add(note.id);
      const allTags = [...new Set([...note.tags, ...(note.autoTags ?? [])])];
      nodes.push({
        id: note.id,
        label: note.title || 'Untitled',
        tagCount: allTags.length,
        modifiedAt: note.modifiedAt,
      });
      for (const tag of allTags) {
        if (!tagToNotes.has(tag)) tagToNotes.set(tag, []);
        tagToNotes.get(tag)!.push(note.id);
      }
    }

    // Determine which tags meet the color threshold
    const coloredTags: string[] = [];
    for (const [tag, ids] of tagToNotes.entries()) {
      if (ids.length >= mapColorThreshold) {
        coloredTags.push(tag);
      }
    }

    // Assign cluster colors to nodes in large tag groups
    // A node gets the color of its largest qualifying tag group
    const nodeToCluster = new Map<string, { tag: string; size: number }>();
    let colorIdx = 0;
    const tagColorMap = new Map<string, string>();
    for (const tag of coloredTags) {
      tagColorMap.set(tag, CLUSTER_COLORS[colorIdx % CLUSTER_COLORS.length]);
      colorIdx++;
      const ids = tagToNotes.get(tag)!;
      for (const id of ids) {
        const existing = nodeToCluster.get(id);
        if (!existing || ids.length > existing.size) {
          nodeToCluster.set(id, { tag, size: ids.length });
        }
      }
    }

    for (const node of nodes) {
      const cluster = nodeToCluster.get(node.id);
      if (cluster) {
        node.clusterColor = tagColorMap.get(cluster.tag);
      }
    }

    // Connect notes that share tags (solid links)
    const pairTags = new Map<string, string[]>();
    for (const [tag, noteIds] of tagToNotes.entries()) {
      if (noteIds.length < 2) continue;
      for (let i = 0; i < noteIds.length; i++) {
        for (let j = i + 1; j < noteIds.length; j++) {
          const key = [noteIds[i], noteIds[j]].sort().join('|');
          if (!pairTags.has(key)) pairTags.set(key, []);
          pairTags.get(key)!.push(tag);
        }
      }
    }

    for (const [key, tags] of pairTags.entries()) {
      const [source, target] = key.split('|');
      links.push({ source, target, type: 'tag', sharedTags: tags });
    }

    // Add wiki links (dashed links)
    const existingPairs = new Set(pairTags.keys());
    for (const link of noteLinks) {
      if (!noteIdSet.has(link.sourceId) || !noteIdSet.has(link.targetId)) continue;
      const pairKey = [link.sourceId, link.targetId].sort().join('|');
      if (!existingPairs.has(pairKey)) {
        links.push({ source: link.sourceId, target: link.targetId, type: 'wiki', sharedTags: [] });
        existingPairs.add(pairKey);
      }
    }

    return { nodes, links };
  }, [notes, noteLinks, mapColorThreshold]);

  // Configure force simulation for spread-out layout
  useEffect(() => {
    const fg = graphRef.current;
    if (!fg) return;
    // Strong repulsion to spread nodes apart
    fg.d3Force('charge')?.strength(-300).distanceMax(500);
    // Longer resting link distance
    fg.d3Force('link')?.distance((link: any) => {
      const l = link as GraphLink;
      // More shared tags = shorter link (tighter cluster)
      const shared = l.sharedTags.length;
      if (shared === 0) return 200; // wiki-only links stay far
      return Math.max(60, 180 - shared * 30);
    });
    // Gentle center pull
    fg.d3Force('center')?.strength(0.03);
    fg.d3ReheatSimulation();
  }, [graphData]);

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      setActiveNote(node.id);
      setView('editor');
    },
    [setActiveNote, setView]
  );

  // Link opacity/width scales with number of shared tags
  const maxShared = useMemo(() => {
    let max = 1;
    for (const l of graphData.links) {
      if (l.sharedTags.length > max) max = l.sharedTags.length;
    }
    return max;
  }, [graphData.links]);

  // Build set of note IDs to highlight when hovering a grouping shelf
  const highlightedNoteIds = useMemo(() => {
    if (!hoveredGroupTag) return null;
    const ids = new Set<string>();
    for (const note of notes) {
      const allTags = [...note.tags, ...(note.autoTags ?? [])];
      if (allTags.includes(hoveredGroupTag)) {
        ids.add(note.id);
      }
    }
    return ids.size > 0 ? ids : null;
  }, [hoveredGroupTag, notes]);

  // Collect active cluster colors for legend
  const activeClusters = useMemo(() => {
    const seen = new Map<string, string>();
    for (const node of graphData.nodes) {
      const n = node as GraphNode;
      if (n.clusterColor) {
        // Find the tag for this color
        const tagToNotes = new Map<string, string[]>();
        for (const note of notes) {
          const allTags = [...new Set([...note.tags, ...(note.autoTags ?? [])])];
          for (const tag of allTags) {
            if (!tagToNotes.has(tag)) tagToNotes.set(tag, []);
            tagToNotes.get(tag)!.push(note.id);
          }
        }
        for (const [tag, ids] of tagToNotes.entries()) {
          if (ids.length >= mapColorThreshold && ids.includes(n.id)) {
            if (!seen.has(tag)) {
              seen.set(tag, n.clusterColor);
            }
          }
        }
      }
    }
    return [...seen.entries()].map(([tag, color]) => ({ tag, color }));
  }, [graphData.nodes, notes, mapColorThreshold]);

  return (
    <div
      className="w-full h-full relative"
      style={{
        background: 'linear-gradient(135deg, #1a0f0a 0%, #2d1f14 50%, #1a0f0a 100%)',
      }}
    >
      {/* Parchment texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-15"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' /%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Subtle vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(10,5,2,0.6) 100%)',
        }}
      />

      {/* Aged stain accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-72 h-72 rounded-full blur-3xl opacity-[0.06]"
          style={{ background: '#8b7355', top: '15%', left: '25%' }}
        />
        <div
          className="absolute w-56 h-56 rounded-full blur-3xl opacity-[0.06]"
          style={{ background: '#d4a574', bottom: '20%', right: '20%' }}
        />
      </div>

      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        backgroundColor="transparent"
        enableNodeDrag={false}
        cooldownTicks={120}
        d3AlphaDecay={0.03}
        d3VelocityDecay={0.25}
        // Spread nodes apart — high charge repulsion, long link distance
        d3AlphaMin={0.01}
        onEngineStop={() => {
          graphRef.current?.zoomToFit(400, 60);
        }}
        onNodeClick={handleNodeClick}
        linkColor={(link: any) => {
          const l = link as GraphLink;
          if (l.type === 'wiki') return 'rgba(212, 165, 116, 0.35)';
          const strength = l.sharedTags.length / maxShared;
          const alpha = 0.2 + strength * 0.5;
          return `rgba(212, 165, 116, ${alpha})`;
        }}
        linkWidth={(link: any) => {
          const l = link as GraphLink;
          if (l.type === 'wiki') return 1;
          const strength = l.sharedTags.length / maxShared;
          return 0.5 + strength * 2;
        }}
        linkLabel={(link: any) => {
          const l = link as GraphLink;
          if (l.type === 'wiki') return 'Wiki link';
          return l.sharedTags.map((t) => `#${t}`).join(', ');
        }}
        linkLineDash={(link: any) => {
          const l = link as GraphLink;
          if (l.type === 'wiki') return [4, 3];
          return null;
        }}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const n = node as GraphNode;
          const size = 3 + (n.tagCount ?? 0) * 0.8;
          const isRecent =
            n.modifiedAt &&
            (Date.now() - new Date(n.modifiedAt).getTime()) / (1000 * 60 * 60) < 24;
          const isHighlighted = highlightedNoteIds?.has(n.id) ?? false;
          const isDimmed = highlightedNoteIds !== null && !isHighlighted;
          const baseColor = n.clusterColor ?? (isRecent ? '#e8c89a' : '#c4a87a');
          const fillColor = isDimmed ? '#3a3028' : isHighlighted ? '#f0d090' : baseColor;
          const borderColor = isDimmed
            ? 'rgba(100, 80, 60, 0.3)'
            : isHighlighted
              ? '#d4a574'
              : n.clusterColor ?? 'rgba(212, 165, 116, 0.6)';

          // Highlight glow
          if (isHighlighted) {
            ctx.save();
            ctx.shadowColor = '#d4a574';
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.arc(node.x, node.y, size + 4, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(212, 165, 116, 0.2)';
            ctx.fill();
            ctx.restore();
          } else if ((isRecent || n.clusterColor) && !isDimmed) {
            // Normal glow for recent or clustered
            ctx.save();
            ctx.shadowColor = baseColor;
            ctx.shadowBlur = n.clusterColor ? 8 : 12;
            ctx.beginPath();
            ctx.arc(node.x, node.y, size + 2, 0, 2 * Math.PI);
            ctx.fillStyle = `${baseColor}25`;
            ctx.fill();
            ctx.restore();
          }

          // Node circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, isHighlighted ? size + 1 : size, 0, 2 * Math.PI);
          ctx.fillStyle = fillColor;
          ctx.fill();
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = isHighlighted ? 1.2 : 0.6;
          ctx.stroke();

          // Label
          const fontSize = Math.max(9 / globalScale, 2.5);
          ctx.font = `${fontSize}px 'Libre Baskerville', serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillStyle = isDimmed ? 'rgba(232, 220, 196, 0.2)' : '#e8dcc4';
          ctx.fillText(n.label, node.x, node.y + (isHighlighted ? size + 1 : size) + fontSize * 0.4);
        }}
        nodePointerAreaPaint={(node: any, color, ctx) => {
          const size = 3 + ((node as GraphNode).tagCount ?? 0) * 0.8;
          ctx.beginPath();
          ctx.arc(node.x, node.y, size + 4, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
      />

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-[#1a0f0a]/90 rounded-lg p-3 shadow-lg backdrop-blur-sm border border-[#d4a574]/30">
        <h3 className="text-xs font-serif font-semibold mb-2 text-[#d4a574] tracking-wide uppercase">
          Knowledge Map
        </h3>
        <div className="flex flex-col gap-1.5 text-[10px]">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#c4a87a', border: '1px solid rgba(212,165,116,0.6)' }} />
            <span className="text-[#b8a88a] font-serif">Note</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#e8c89a', boxShadow: '0 0 6px rgba(212,165,116,0.4)' }} />
            <span className="text-[#b8a88a] font-serif">Recently edited</span>
          </div>
          {activeClusters.length > 0 && (
            <>
              <div className="mt-1 pt-1 border-t border-[#d4a574]/20">
                <span className="text-[9px] text-[#8b7355] font-serif italic">Clusters ({mapColorThreshold}+)</span>
              </div>
              {activeClusters.map(({ tag, color }) => (
                <div key={tag} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 4px ${color}66` }} />
                  <span className="text-[#b8a88a] font-serif">#{tag}</span>
                </div>
              ))}
            </>
          )}
          <div className="mt-1 pt-1 border-t border-[#d4a574]/20">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-[1.5px]" style={{ background: 'rgba(212, 165, 116, 0.5)' }} />
              <span className="text-[#b8a88a] font-serif">Shared tags</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="24" height="2" className="flex-shrink-0">
                <line x1="0" y1="1" x2="24" y2="1" stroke="rgba(212, 165, 116, 0.35)" strokeWidth="1.5" strokeDasharray="4 3" />
              </svg>
              <span className="text-[#b8a88a] font-serif">Wiki links</span>
            </div>
          </div>
        </div>
        <p className="text-[9px] italic mt-2 text-[#8b7355] font-serif">
          Click a node to open
        </p>
      </div>
    </div>
  );
}
