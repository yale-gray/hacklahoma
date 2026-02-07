export interface GraphNode {
  id: string;
  label: string;
  tags: string[];
  linkCount: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'explicit' | 'suggested';
  strength?: number;
}
