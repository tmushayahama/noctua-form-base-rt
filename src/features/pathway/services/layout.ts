import { ActivityType } from '@/features/gocam/models/cam';
import dagre from 'dagre';
import type { Node, Edge } from 'reactflow';
import { Position } from 'reactflow';
import { GRAPH_DIMENSIONS } from '../constants';

export const getEdgeParams = (
  source: Node,
  target: Node
) => {
  const sourceIntersectionPoint = getNodeIntersection(source, target);
  const targetIntersectionPoint = getNodeIntersection(target, source);

  const sourcePos = getNodePosition(source, target);
  const targetPos = getNodePosition(target, source);

  return {
    sx: sourceIntersectionPoint.x,
    sy: sourceIntersectionPoint.y,
    tx: targetIntersectionPoint.x,
    ty: targetIntersectionPoint.y,
    sourcePos,
    targetPos,
  };
};

const getNodeIntersection = (
  source: Node,
  target: Node
) => {
  const { width: sourceWidth, height: sourceHeight } = source;
  const sourceCenter = getNodeCenter(source);
  const targetCenter = getNodeCenter(target);

  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;

  const angle = Math.atan2(dy, dx);

  const halfWidth = sourceWidth ? sourceWidth / 2 : 0;
  const halfHeight = sourceHeight ? sourceHeight / 2 : 0;

  return {
    x: sourceCenter.x + Math.cos(angle) * halfWidth,
    y: sourceCenter.y + Math.sin(angle) * halfHeight,
  };
};

const getNodeCenter = (node: Node) => {
  const { width = 0, height = 0, position } = node;
  return {
    x: position.x + width / 2,
    y: position.y + height / 2,
  };
};

const getNodePosition = (node: Node, target: Node) => {
  const nodeCenter = getNodeCenter(node);
  const targetCenter = getNodeCenter(target);

  const dx = targetCenter.x - nodeCenter.x;
  const dy = targetCenter.y - nodeCenter.y;

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? Position.Right : Position.Left;
  }

  return dy > 0 ? Position.Bottom : Position.Top;
};

export const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction: string = 'TB',
  nodeHeights: Record<string, number> = {}
) => {
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
      : nodeHeights[node.id] || GRAPH_DIMENSIONS.HEIGHT_PER_NODE;

    dagreGraph.setNode(node.id, {
      width: GRAPH_DIMENSIONS.NODE_WIDTH,
      height,
    });
  });

  edges.forEach(edge => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

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
      : nodeHeights[node.id] || GRAPH_DIMENSIONS.HEIGHT_PER_NODE;

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
      type: 'arrowclosed',
      color: '#6366F1',
      width: 15,
      height: 15,
    },
  }));

  return { nodes: layoutedNodes, edges: layoutedEdges, dynamicHeight };
};