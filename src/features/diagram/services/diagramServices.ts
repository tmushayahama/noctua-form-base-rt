import { GRAPH_DIMENSIONS } from '@/features/diagram/constants';
import { ActivityType } from '@/features/gocam/models/cam';
import dagre from 'dagre';
import type { Node as FlowNode, Edge as FlowEdge } from 'reactflow';
import { MarkerType } from 'reactflow';

export function getLayoutedElements(
  nodes: FlowNode[],
  edges: FlowEdge[],
  direction: string,
  nodeHeights: Record<string, number>,
) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    ranker: 'network-simplex',
    ranksep: 150,
    nodesep: 80,
    marginx: 50,
    marginy: 50,
    acyclicer: 'greedy',
    align: 'UL'
  });

  nodes.forEach((node) => {
    const isMolecular = node.type === ActivityType.MOLECULE;
    const height = isMolecular
      ? GRAPH_DIMENSIONS.MOLECULAR_NODE_SIZE
      : nodeHeights[node.id] || 140;

    dagreGraph.setNode(node.id, {
      width: GRAPH_DIMENSIONS.NODE_WIDTH,
      height,
    });
  });

  edges.forEach(edge => dagreGraph.setEdge(edge.source, edge.target));

  dagre.layout(dagreGraph);

  let minY = Infinity;
  let maxY = -Infinity;

  const layoutedNodes = nodes.map((node) => {
    const nodePos = dagreGraph.node(node.id);
    const isMolecular = node.type === ActivityType.MOLECULE;
    const width = isMolecular
      ? GRAPH_DIMENSIONS.MOLECULAR_NODE_SIZE
      : GRAPH_DIMENSIONS.NODE_WIDTH;
    const height = isMolecular
      ? GRAPH_DIMENSIONS.MOLECULAR_NODE_SIZE
      : nodeHeights[node.id] || 140;

    const x = nodePos.x - width / 2;
    const y = nodePos.y - height / 2;

    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y + height);

    return {
      ...node,
      position: { x, y },
      width,
      height,
      style: { width, height },
      data: {
        ...node.data,
        uid: node.id
      }
    };
  });

  const dynamicHeight = Math.max(
    GRAPH_DIMENSIONS.MIN_CONTAINER_HEIGHT,
    maxY - minY + GRAPH_DIMENSIONS.PADDING
  );

  const layoutedEdges = edges.map((edge) => ({
    ...edge,
    type: 'floating',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#6366F1',
      width: 15,
      height: 15,
    },
  }));

  return { nodes: layoutedNodes, edges: layoutedEdges, dynamicHeight };
}
