import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { setRightDrawerOpen } from '@/@pango.core/components/drawer/drawerSlice';
import { useAppDispatch } from '@/app/hooks';
import { setSelectedActivity } from '../slices/camSlice';

// Constants for node dimensions
const NODE_WIDTH = 220;
const NODE_HEIGHT = 140;
const MOLECULAR_NODE_SIZE = 150;
const MIN_CONTAINER_HEIGHT = 400; // Minimum height
const HEIGHT_PER_NODE = 200; // Approximate height needed per node
const PADDING = 100; // Extra padding

// Custom node component for regular activities
const ActivityNode = ({ data }: { data: any }) => {

  const renderEdges = (edges: any[], level = 0) => {
    if (!edges || edges.length === 0) return null;

    return (
      <div className={`${level > 0 ? 'ml-3 border-l-2 border-gray-200 pl-2' : ''}`}>
        {edges.map((edge: any) => (
          <div key={edge.id} className="mb-2">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-indigo-400 rounded-full mr-1"></div>
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
        <div className="text-xs bg-indigo-50 p-1 rounded mt-1 border border-indigo-100 line-clamp-2">
          <div>{data.molecularFunction.label}</div>
        </div>
      )}

      {data.enabledBy && (
        <div className="text-xs bg-green-50 p-1 rounded mt-1 border border-green-100  line-clamp-2">
          <div>{data.enabledBy.label}</div>
        </div>
      )}

      {data.edges && data.edges.length > 0 && (
        <div className="mt-2 bg-gray-50 p-2 rounded border border-gray-200">
          <div className="text-xs font-medium mb-1">Edges:</div>
          {renderEdges(data.edges)}
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
  const [graphHeight, setGraphHeight] = useState(MIN_CONTAINER_HEIGHT);
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

    // Calculate layout bounds to determine container height
    let minY = Infinity;
    let maxY = -Infinity;

    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      const isMolecular = node.type === 'molecular';
      const width = isMolecular ? MOLECULAR_NODE_SIZE : NODE_WIDTH;
      const height = isMolecular ? MOLECULAR_NODE_SIZE : NODE_HEIGHT;

      const x = nodeWithPosition.x - width / 2;
      const y = nodeWithPosition.y - height / 2;

      // Track min and max Y positions
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y + height);

      return {
        ...node,
        position: { x, y },
        width,
        height,
        style: { width, height }
      };
    });

    // Calculate dynamic height based on graph content
    // Add padding to ensure all nodes are visible
    const graphContentHeight = maxY - minY + PADDING;
    const dynamicHeight = Math.max(MIN_CONTAINER_HEIGHT, graphContentHeight);

    return {
      nodes: layoutedNodes,
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
      dynamicHeight
    };
  }, []);

  const applyLayout = useCallback(() => {
    if (layouting.current || initialNodes.length === 0) return;

    layouting.current = true;

    requestAnimationFrame(() => {
      const { nodes: layoutedNodes, edges: layoutedEdges, dynamicHeight } = getLayoutedElements(
        initialNodes,
        initialEdges,
        direction
      );

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      setGraphHeight(dynamicHeight);

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

  // Calculate a dynamic height based on node count as a fallback
  useEffect(() => {
    const nodeBasedHeight = Math.max(
      MIN_CONTAINER_HEIGHT,
      initialNodes.length * HEIGHT_PER_NODE
    );
    setGraphHeight(nodeBasedHeight);
  }, [initialNodes.length]);

  return { nodes, edges, onNodesChange, onEdgesChange, applyLayout, graphHeight };
};

interface ActivityFlowProps {
  graphModel: GraphModel;
  className?: string;
}

const ActivityFlow: React.FC<ActivityFlowProps> = ({ graphModel, className = '' }) => {


  const dispatch = useAppDispatch();

  // Add this handler for node clicks
  const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    console.log('Node clicked:', node);
    const activity = node.data;

    if (activity) {
      dispatch(setSelectedActivity(activity));
      dispatch(setRightDrawerOpen(true));
    }
  }, [dispatch]);

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

  const { nodes, edges, onNodesChange, onEdgesChange, applyLayout, graphHeight } =
    useLayoutedElements(initialNodes, initialEdges);

  if (!graphModel) return null;

  return (
    <div
      className={`w-full border border-gray-200 rounded-md ${className}`}
      style={{ height: `${graphHeight}px` }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
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