import type React from 'react';
import { useCallback, useEffect, useMemo } from 'react';
import type { Node as FlowNode, Edge as FlowEdge } from 'reactflow';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  ConnectionLineType,
  Panel,
  Handle,
  Position
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import type { GraphModel, Activity, ActivityType } from '../models/cam';

// Custom node component for regular activities
const ActivityNode = ({ data }: { data: any }) => {
  // Function to render edges recursively
  const renderEdges = (edges: any[], level = 0) => {
    if (!edges || edges.length === 0) return null;

    return (
      <div className={`${level > 0 ? 'ml-3 border-l-2 border-gray-200 pl-2' : ''}`}>
        {edges.map((edge: any) => (
          <div key={edge.id} className="mb-2">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-indigo-400 rounded-full mr-1"></div>
              <span className="text-xs font-medium">{edge.source.label}</span>
              <span className="mx-1 text-xs text-gray-400">→</span>
              <span className="text-xs text-gray-700">{edge.label}</span>
              <span className="mx-1 text-xs text-gray-400">→</span>
              <span className="text-xs font-medium">{edge.target.label}</span>
            </div>

            {/* Recursively render nested edges if they exist */}
            {edge.edges && renderEdges(edge.edges, level + 1)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-3 rounded-lg shadow-md border border-gray-200 bg-white min-w-64">
      <Handle type="target" position={Position.Top} id="target" />
      <Handle type="source" position={Position.Bottom} id="source" />

      <div className="font-semibold text-sm truncate">{data.label}</div>

      {data.molecularFunction && (
        <div className="text-xs bg-indigo-50 p-1 rounded mt-1 border border-indigo-100">
          <div className="font-medium">Molecular Function:</div>
          <div>{data.molecularFunction.label}</div>
        </div>
      )}

      {data.enabledBy && (
        <div className="text-xs bg-green-50 p-1 rounded mt-1 border border-green-100">
          <div className="font-medium">Enabled By:</div>
          <div>{data.enabledBy.label}</div>
        </div>
      )}

      {data.edges && data.edges.length > 0 && (
        <div className="mt-2 bg-gray-50 p-2 rounded border border-gray-200">
          <div className="text-xs font-medium mb-1">Edges:</div>
          {renderEdges(data.edges)}
        </div>
      )}

      {data.date && (
        <div className="text-xs text-gray-400 mt-2">
          {new Date(data.date).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

// Custom node component for molecular activities
const MolecularNode = ({ data }: { data: any }) => {
  return (
    <div className="flex items-center justify-center rounded-full w-32 h-32 shadow-md bg-blue-100 border border-blue-300">
      <Handle type="target" position={Position.Top} id="target" />
      <Handle type="source" position={Position.Bottom} id="source" />

      <div className="text-center p-2">
        <div className="font-semibold text-sm">{data.rootNode.label}</div>
        {data.date && (
          <div className="text-xs text-gray-500 mt-1">
            {new Date(data.date).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
};

// Node types for React Flow
const nodeTypes = {
  activity: ActivityNode,
  molecular: MolecularNode,
};

// Dagre layout configuration
const getLayoutedElements = (nodes: FlowNode[], edges: FlowEdge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction });

  // Set node dimensions based on type
  nodes.forEach((node) => {
    if (node.type === 'molecular') {
      dagreGraph.setNode(node.id, { width: 130, height: 130 });
    } else {
      dagreGraph.setNode(node.id, { width: 180, height: 100 });
    }
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
      let xOffset = node.type === 'molecular' ? 65 : 90;
      let yOffset = node.type === 'molecular' ? 65 : 50;

      return {
        ...node,
        position: {
          x: nodeWithPosition.x - xOffset,
          y: nodeWithPosition.y - yOffset,
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

    return graphModel.activities.map((activity: Activity) => ({
      id: activity.uid,
      type: activity.type === 'molecule' ? 'molecular' : 'activity',
      position: { x: 0, y: 0 }, // Initial positions will be calculated by dagre
      data: {
        label: activity.molecularFunction?.label || activity.rootNode.label,
        molecularFunction: activity.molecularFunction,
        enabledBy: activity.enabledBy,
        date: activity.date,
        rootNode: activity.rootNode,
        type: activity.type,
        nodes: activity.nodes,
        edges: activity.edges,
      },
    }));
  }, [graphModel?.activities]);

  // Transform activity connections to React Flow edges
  const initialEdges: FlowEdge[] = useMemo(() => {
    if (!graphModel?.activityConnections?.length) return [];

    return graphModel.activityConnections.map((connection) => ({
      id: connection.id,
      source: connection.sourceId,
      target: connection.targetId,
      sourceHandle: 'source',  // Explicitly set source handle ID
      targetHandle: 'target',  // Explicitly set target handle ID
      label: connection.label,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#6366F1' },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#6366F1',
      },
      labelStyle: {
        fill: '#374151',
        fontWeight: 500,
        fontSize: 11,
        backgroundColor: '#F3F4F6',
        padding: '2px 4px',
        borderRadius: '2px'
      },
      labelBgStyle: { fill: '#F3F4F6' },
      data: { originalEdge: connection },
    }));
  }, [graphModel?.activityConnections]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Apply layout and set nodes/edges when data changes
  useEffect(() => {
    if (initialNodes.length) {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        initialNodes,
        initialEdges,
        'TB' // Top to Bottom layout
      );
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    }
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Handle manual layout adjustment
  const onLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
      'TB'
    );
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
  }, [nodes, edges, setNodes, setEdges]);

  if (!graphModel) return null;

  return (
    <div className="w-full h-full border border-gray-200 rounded-md">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
      >
        <Background pattern="dots" gap={12} size={1} />
        <Controls />
        <Panel position="top-right" className="bg-white p-2 rounded shadow-md">
          <button
            onClick={onLayout}
            className="px-2 py-1 bg-indigo-600 text-white rounded text-sm"
          >
            Reset Layout
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default ActivityFlow;