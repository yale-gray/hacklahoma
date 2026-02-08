import { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useNoteStore } from '@/stores/noteStore';
import { useUIStore } from '@/stores/uiStore';
import { db } from '@/db/database';
import type { NoteLink } from '@/types/note';
import { ColorPicker } from './ColorPicker';

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
  const customClusterColors = useUIStore((s) => s.customClusterColors);
  const setCustomClusterColor = useUIStore((s) => s.setCustomClusterColor);
  const graphRef = useRef<any>(null);
  const colorButtonRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [noteLinks, setNoteLinks] = useState<NoteLink[]>([]);
  const [editingTag, setEditingTag] = useState<{ tag: string; color: string } | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [legendExpanded, setLegendExpanded] = useState(false);

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
      // Use custom color if set, otherwise use default palette
      const color = customClusterColors[tag] ?? CLUSTER_COLORS[colorIdx % CLUSTER_COLORS.length];
      tagColorMap.set(tag, color);
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
  }, [notes, noteLinks, mapColorThreshold, customClusterColors]);

  // Configure force simulation for spread-out layout
  useEffect(() => {
    const fg = graphRef.current;
    if (!fg) return;
    // Very strong repulsion to spread unconnected nodes apart
    fg.d3Force('charge')?.strength(-800).distanceMax(800);
    // Link distance based on connection strength
    fg.d3Force('link')?.distance((link: any) => {
      const l = link as GraphLink;
      // More shared tags = shorter link (tighter cluster)
      const shared = l.sharedTags.length;
      if (shared === 0) return 300; // wiki-only links stay very far
      // Nodes with shared tags get pulled closer together
      return Math.max(50, 150 - shared * 20);
    }).strength((link: any) => {
      const l = link as GraphLink;
      const shared = l.sharedTags.length;
      // Stronger pull for nodes with more shared tags
      if (shared === 0) return 0.1; // weak pull for wiki links
      return Math.min(1, 0.3 + shared * 0.15);
    });
    // Remove center force - let nodes spread naturally
    fg.d3Force('center', null);
    // Add collision to prevent overlap
    fg.d3Force('collision', fg.d3Force('collision')?.radius((node: any) => {
      const n = node as GraphNode;
      return 2 + (n.tagCount ?? 0) * 0.5 + 10; // node size + padding
    }));
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
              // Use custom color if set, otherwise use the cluster color from the node
              const color = customClusterColors[tag] ?? n.clusterColor;
              seen.set(tag, color);
            }
          }
        }
      }
    }
    return [...seen.entries()].map(([tag, color]) => ({ tag, color }));
  }, [graphData.nodes, notes, mapColorThreshold, customClusterColors]);

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
        enableZoomInteraction={true}
        enablePanInteraction={true}
        cooldownTicks={120}
        d3AlphaDecay={0.03}
        d3VelocityDecay={0.25}
        d3AlphaMin={0.01}
        onEngineStop={() => {
          graphRef.current?.zoomToFit(400, 60);
        }}
        onNodeClick={handleNodeClick}
        onNodeHover={(node) => setHoveredNode(node ? (node as GraphNode).id : null)}
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
        nodeCanvasObject={(node: any, ctx) => {
          const n = node as GraphNode;
          const size = 2 + (n.tagCount ?? 0) * 0.5;
          const isRecent =
            n.modifiedAt &&
            (Date.now() - new Date(n.modifiedAt).getTime()) / (1000 * 60 * 60) < 24;
          const isHighlighted = highlightedNoteIds?.has(n.id) ?? false;
          const isHovered = hoveredNode === n.id;
          const isDimmed = highlightedNoteIds !== null && !isHighlighted;
          const baseColor = n.clusterColor ?? (isRecent ? '#e8c89a' : '#c4a87a');
          const fillColor = isDimmed ? '#3a3028' : isHighlighted ? '#f0d090' : baseColor;
          const borderColor = isDimmed
            ? 'rgba(100, 80, 60, 0.3)'
            : isHighlighted
              ? '#d4a574'
              : n.clusterColor ?? 'rgba(212, 165, 116, 0.6)';

          // Highlight glow
          if (isHighlighted || isHovered) {
            ctx.save();
            ctx.shadowColor = '#d4a574';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(node.x, node.y, size + 3, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(212, 165, 116, 0.2)';
            ctx.fill();
            ctx.restore();
          } else if ((isRecent || n.clusterColor) && !isDimmed) {
            // Normal glow for recent or clustered
            ctx.save();
            ctx.shadowColor = baseColor;
            ctx.shadowBlur = n.clusterColor ? 6 : 8;
            ctx.beginPath();
            ctx.arc(node.x, node.y, size + 1.5, 0, 2 * Math.PI);
            ctx.fillStyle = `${baseColor}25`;
            ctx.fill();
            ctx.restore();
          }

          // Node circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, (isHighlighted || isHovered) ? size + 0.5 : size, 0, 2 * Math.PI);
          ctx.fillStyle = fillColor;
          ctx.fill();
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = (isHighlighted || isHovered) ? 1 : 0.5;
          ctx.stroke();

          // Label - always show, small and transparent (brighter on hover)
          const fontSize = isHovered ? 11 : 8;
          ctx.font = `${fontSize}px 'Libre Baskerville', serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          const textX = node.x;
          const textY = node.y + size + 2;

          if (isHovered) {
            // Add background for hovered label
            const textMetrics = ctx.measureText(n.label);
            const textWidth = textMetrics.width;
            const textHeight = fontSize;
            const padding = 4;

            ctx.fillStyle = 'rgba(26, 15, 10, 0.9)';
            ctx.fillRect(
              textX - textWidth / 2 - padding,
              textY - padding / 2,
              textWidth + padding * 2,
              textHeight + padding
            );
            ctx.fillStyle = '#e8dcc4';
          } else {
            // Small, transparent label for non-hovered nodes
            ctx.fillStyle = isDimmed ? 'rgba(232, 220, 196, 0.15)' : 'rgba(232, 220, 196, 0.4)';
          }
          ctx.fillText(n.label, textX, textY);
        }}
        nodePointerAreaPaint={(node: any, color, ctx) => {
          const size = 2 + ((node as GraphNode).tagCount ?? 0) * 0.5;
          ctx.beginPath();
          ctx.arc(node.x, node.y, size + 3, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
      />

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-[#1a0f0a]/90 rounded-lg shadow-lg backdrop-blur-sm border border-[#d4a574]/30 overflow-hidden">
        <button
          onClick={() => setLegendExpanded(!legendExpanded)}
          className="w-full flex items-center justify-between p-3 hover:bg-[#2d1f14]/50 transition-colors"
        >
          <h3 className="text-xs font-serif font-semibold text-[#d4a574] tracking-wide uppercase">
            Knowledge Map
          </h3>
          <svg
            className={`w-4 h-4 text-[#d4a574] transition-transform duration-200 ${legendExpanded ? 'rotate-45' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {legendExpanded && (
          <div className="px-3 pb-3">
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
                      <button
                        ref={(el) => {
                          if (el) {
                            colorButtonRefs.current.set(tag, el);
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTag({ tag, color });
                        }}
                        className="w-2.5 h-2.5 rounded-full cursor-pointer hover:ring-2 hover:ring-[#d4a574]/50 transition-all"
                        style={{ background: color, boxShadow: `0 0 4px ${color}66` }}
                        title="Click to change color"
                      />
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
        )}
      </div>

      {/* Color Picker Popup */}
      {editingTag && (
        <ColorPicker
          color={editingTag.color}
          onChange={(newColor) => {
            setCustomClusterColor(editingTag.tag, newColor);
            setEditingTag({ ...editingTag, color: newColor });
          }}
          onClose={() => setEditingTag(null)}
          anchorEl={colorButtonRefs.current.get(editingTag.tag) ?? null}
        />
      )}
    </div>
  );
}
