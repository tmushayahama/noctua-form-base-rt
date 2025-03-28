import type React from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Node as FlowNode, Edge as FlowEdge, NodeTypes } from 'reactflow';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  ConnectionLineType,
  Panel,
  Handle,
  Position,
  useReactFlow
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import type { GraphModel, Activity } from '../models/cam';
import { ActivityType } from '../models/cam';

// Constants for node dimensions
const NODE_WIDTH = 220;
const NODE_HEIGHT = 140;
const MOLECULAR_NODE_SIZE = 150;

// Custom node component for regular activities
const ActivityNode = ({ data }: { data: any }) => {
  return (
    <div
      className="p-3 rounded-lg shadow-md border border-gray-200 bg-white"
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
      />
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
    <div
      className="flex items-center justify-center rounded-full shadow-md bg-blue-100 border border-blue-300"
      style={{ width: MOLECULAR_NODE_SIZE, height: MOLECULAR_NODE_SIZE }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
      />
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
const nodeTypes: NodeTypes = {
  activity: ActivityNode,
  molecular: MolecularNode,
};

// Custom hook for layout calculation
const useLayoutedElements = (initialNodes: FlowNode[], initialEdges: FlowEdge[], direction = 'TB') => {
  const { fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const layouting = useRef(false);

  const getLayoutedElements = useCallback((nodes: FlowNode[], edges: FlowEdge[], dir: string) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // Configure the layout with increased spacing
    dagreGraph.setGraph({
      rankdir: dir,
      ranker: 'network-simplex', // Better for most layouts
      ranksep: 150, // Increased vertical spacing between ranks
      nodesep: 80,  // Increased horizontal spacing between nodes
      marginx: 50,
      marginy: 50,
      acyclicer: 'greedy',
      align: 'UL'
    });

    // Set fixed node dimensions
    nodes.forEach((node) => {
      const isMolecular = node.type === 'molecular';
      dagreGraph.setNode(node.id, {
        width: isMolecular ? MOLECULAR_NODE_SIZE : NODE_WIDTH,
        height: isMolecular ? MOLECULAR_NODE_SIZE : NODE_HEIGHT
      });
    });

    // Add edges to the graph
    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    return {
      nodes: nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        const isMolecular = node.type === 'molecular';
        const width = isMolecular ? MOLECULAR_NODE_SIZE : NODE_WIDTH;
        const height = isMolecular ? MOLECULAR_NODE_SIZE : NODE_HEIGHT;

        return {
          ...node,
          position: {
            x: nodeWithPosition.x - width / 2,
            y: nodeWithPosition.y - height / 2,
          },
          // Store the width/height for proper connection points
          width,
          height,
          style: { width, height }
        };
      }),
      edges: edges.map(edge => ({
        ...edge,
        type: 'straight', // Force straight edges
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#6366F1',
          width: 15,
          height: 15,
        },
      })),
    };
  }, []);

  const applyLayout = useCallback(() => {
    if (layouting.current || initialNodes.length === 0) return;

    layouting.current = true;

    requestAnimationFrame(() => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        initialNodes,
        initialEdges,
        direction
      );

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);

      // Fit view after layout
      setTimeout(() => {
        fitView({ padding: 0.3, duration: 400 });
        layouting.current = false;
      }, 100);
    });
  }, [initialNodes, initialEdges, direction, getLayoutedElements, setNodes, setEdges, fitView]);

  useEffect(() => {
    applyLayout();
  }, [applyLayout]);

  return { nodes, edges, onNodesChange, onEdgesChange, applyLayout };
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
      type: activity.type === ActivityType.MOLECULE ? 'molecular' : 'activity',
      position: { x: 0, y: 0 },
      data: {
        label: activity.molecularFunction?.label || activity.rootNode.label,
        molecularFunction: activity.molecularFunction,
        enabledBy: activity.enabledBy,
        date: activity.date,
        rootNode: activity.rootNode,
        type: activity.type,
      },
    }));
  }, [graphModel?.activities]);

  // Transform activity connections to React Flow edges
  const initialEdges: FlowEdge[] = useMemo(() => {
    if (!graphModel?.activityConnections?.length) return [];

    return graphModel.activityConnections.map((connection, index) => ({
      id: connection.id + index,
      source: connection.isReverseLink ? connection.targetId : connection.sourceId,
      target: connection.isReverseLink ? connection.sourceId : connection.targetId,
      sourceHandle: 'bottom-source',
      targetHandle: 'top-target',
      label: connection.isReverseLink ? connection.reverseLinkLabel : connection.label,
      type: 'default',
      style: {
        stroke: '#6366F1',
        strokeWidth: 1,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#6366F1',
        width: 15,
        height: 15,
      },
      labelStyle: {
        fill: '#374151',
        fontWeight: 500,
        fontSize: 11,
        backgroundColor: '#F3F4F6',
        padding: '2px 4px',
        borderRadius: '2px'
      },
      labelBgStyle: { fill: 'transparent' },
      data: { originalEdge: connection },
    }));
  }, [graphModel?.activityConnections]);

  const { nodes, edges, onNodesChange, onEdgesChange, applyLayout } =
    useLayoutedElements(initialNodes, initialEdges);

  if (!graphModel) return null;

  return (
    <div className="w-full h-full border border-gray-200 rounded-md">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.Straight}
        minZoom={0.1}
        maxZoom={2}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        snapToGrid={true}
        snapGrid={[15, 15]}
      >
        <Background gap={20} size={1} />
        <Controls />
        <Panel position="top-right" className="bg-white p-2 rounded shadow-md">
          <button
            onClick={applyLayout}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 transition-colors"
          >
            Recalculate Layout
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default ActivityFlow;