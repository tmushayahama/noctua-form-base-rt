import type React from 'react';
import { useCallback, useEffect, useMemo } from 'react';
import type {
  Node as FlowNode,
  Edge as FlowEdge,
  Edge
} from 'reactflow';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  ConnectionLineType,
  Panel
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import type { GraphModel, Activity } from '../models/cam';

// Custom node component for activities
const ActivityNode = ({ data }: { data: any }) => {
  return (
    <div className="p-3 rounded-lg shadow-md border border-gray-200 bg-white min-w-64">
      <div className="font-semibold text-sm truncate">{data.label}</div>
      <div className="text-xs text-gray-500 mt-1">
        <span className="font-medium">Function:</span> {data.molecularFunction?.label || 'N/A'}
      </div>
      <div className="text-xs text-gray-500">
        <span className="font-medium">Enabled by:</span> {data.enabledBy?.label || 'N/A'}
      </div>
      {data.date && (
        <div className="text-xs text-gray-400 mt-2">
          {new Date(data.date).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

// Node types for React Flow
const nodeTypes = {
  activity: ActivityNode,
};

// Dagre layout configuration
const getLayoutedElements = (nodes: FlowNode[], edges: FlowEdge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction });

  // Set node dimensions
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 180, height: 100 });
  });

  // Add edges to the graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Execute the layout
  dagre.layout(dagreGraph);

  // Apply the layout to the nodes
  return {
    nodes: nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - 90, // Center the node
          y: nodeWithPosition.y - 50,
        },
      };
    }),
    edges,
  };
};

interface ActivityFlowProps {
  graphModel: GraphModel;
}

const ActivityFlow: React.FC<ActivityFlowProps> = ({ graphModel }) => {
  // Transform activities to React Flow nodes
  const initialNodes: FlowNode[] = useMemo(() => {
    if (!graphModel?.activities?.length) return [];

    return graphModel.activities.map((activity: Activity, index: number) => ({
      id: activity.uid,
      type: 'activity',
      position: { x: 0, y: 0 }, // Initial positions will be calculated by dagre
      data: {
        label: activity.molecularFunction?.label || `Activity ${index + 1}`,
        molecularFunction: activity.molecularFunction,
        enabledBy: activity.enabledBy,
        date: activity.date,
      },
    }));
  }, [graphModel?.activities]);

  // Transform activity connections to React Flow edges
  const initialEdges: FlowEdge[] = useMemo(() => {
    if (!graphModel?.activityConnections?.length) return [];

    return graphModel.activityConnections.map((connection: Edge) => ({
      id: connection.id,
      source: connection.sourceId,
      target: connection.targetId,
      label: connection.label,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#6366F1' },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#6366F1',
      },
    }));
  }, [graphModel?.activityConnections]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Apply layout and set nodes/edges when data changes
  useEffect(() => {
    if (initialNodes.length) {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        initialNodes,
        initialEdges
      );
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    }
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Handle manual layout adjustments
  const onLayout = useCallback((direction: 'TB' | 'LR') => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
      direction
    );
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
  }, [nodes, edges, setNodes, setEdges]);

  if (!graphModel) return null;

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
      >
        <Background />
        <Controls />
        <Panel position="top-right" className="bg-white p-2 rounded shadow-md">
          <div className="flex space-x-2">
            <button
              onClick={() => onLayout('TB')}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              Vertical Layout
            </button>
            <button
              onClick={() => onLayout('LR')}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              Horizontal Layout
            </button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default ActivityFlow;