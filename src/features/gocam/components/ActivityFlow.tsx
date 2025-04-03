import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Node as FlowNode, Edge as FlowEdge, XYPosition } from 'reactflow';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  ConnectionLineType,
  Panel,
  useReactFlow
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import type { GraphModel, Activity } from '../models/cam';
import { ActivityType } from '../models/cam';
import { setRightDrawerOpen } from '@/@pango.core/components/drawer/drawerSlice';
import { useAppDispatch } from '@/app/hooks';
import { setSelectedActivity } from '../slices/camSlice';
import ActivityDialog from './dialogs/ActivityFormDialog';
import ActivityForm from './forms/ActivityForm';
import { GRAPH_DIMENSIONS } from '../constants';
import { StencilActivityItem, StencilMoleculeItem, nodeTypes } from './diagram/ActivityNodes';


const useLayoutedElements = (initialNodes: FlowNode[], initialEdges: FlowEdge[], direction = 'TB') => {
  const { fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [graphHeight, setGraphHeight] = useState(GRAPH_DIMENSIONS.MIN_CONTAINER_HEIGHT);
  const [nodeHeights, setNodeHeights] = useState<Record<string, number>>({});
  const layouting = useRef(false);

  // Callback to update node heights
  const onNodeHeightChange = useCallback((nodeId: string, height: number) => {
    setNodeHeights(prev => {
      const newHeights = { ...prev, [nodeId]: height };
      return newHeights;
    });
  }, []);

  const getLayoutedElements = useCallback((nodes: FlowNode[], edges: FlowEdge[], dir: string, heights: Record<string, number>) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    dagreGraph.setGraph({
      rankdir: dir,
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
      const nodeHeight = isMolecular ? GRAPH_DIMENSIONS.MOLECULAR_NODE_SIZE : (heights[node.id] || 140);

      dagreGraph.setNode(node.id, {
        width: isMolecular ? GRAPH_DIMENSIONS.MOLECULAR_NODE_SIZE : GRAPH_DIMENSIONS.NODE_WIDTH,
        height: nodeHeight
      });
    });

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    // Calculate layout bounds to determine container height
    let minY = Infinity;
    let maxY = -Infinity;

    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      const isMolecular = node.type === ActivityType.MOLECULE;
      const width = isMolecular ? GRAPH_DIMENSIONS.MOLECULAR_NODE_SIZE : GRAPH_DIMENSIONS.NODE_WIDTH;
      const height = isMolecular ? GRAPH_DIMENSIONS.MOLECULAR_NODE_SIZE : (heights[node.id] || 140);

      const x = nodeWithPosition.x - width / 2;
      const y = nodeWithPosition.y - height / 2;

      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y + height);

      // Add the onHeightChange callback to the node data
      const updatedData = {
        ...node.data,
        onHeightChange: onNodeHeightChange,
        uid: node.id
      };

      return {
        ...node,
        position: { x, y },
        width,
        height,
        style: { width, height },
        data: updatedData
      };
    });

    // Calculate dynamic height based on graph content
    // Add padding to ensure all nodes are visible
    const graphContentHeight = maxY - minY + GRAPH_DIMENSIONS.PADDING;
    const dynamicHeight = Math.max(GRAPH_DIMENSIONS.MIN_CONTAINER_HEIGHT, graphContentHeight);

    return {
      nodes: layoutedNodes,
      edges: edges.map(edge => ({
        ...edge,
        type: 'default',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#6366F1',
          width: 15,
          height: 15,
        },
      })),
      dynamicHeight
    };
  }, [onNodeHeightChange]);

  const applyLayout = useCallback(() => {
    if (layouting.current || initialNodes.length === 0) return;

    layouting.current = true;

    requestAnimationFrame(() => {
      const { nodes: layoutedNodes, edges: layoutedEdges, dynamicHeight } = getLayoutedElements(
        initialNodes,
        initialEdges,
        direction,
        nodeHeights
      );

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      setGraphHeight(dynamicHeight);

      // Fit view after layout
      setTimeout(() => {
        fitView({ padding: 0.1, duration: 400 });
        layouting.current = false;
      }, 100);
    });
  }, [initialNodes, initialEdges, direction, getLayoutedElements, setNodes, setEdges, fitView, nodeHeights]);

  // Re-apply layout when node heights change
  useEffect(() => {
    if (Object.keys(nodeHeights).length > 0 && nodes.length > 0) {
      applyLayout();
    }
  }, [nodeHeights, nodes.length, applyLayout]);

  // Initial layout
  useEffect(() => {
    applyLayout();
  }, [initialNodes, initialEdges, applyLayout]);

  // Calculate a dynamic height based on node count as a fallback
  useEffect(() => {
    const nodeBasedHeight = Math.max(
      GRAPH_DIMENSIONS.MIN_CONTAINER_HEIGHT,
      initialNodes.length * GRAPH_DIMENSIONS.HEIGHT_PER_NODE
    );
    setGraphHeight(nodeBasedHeight);
  }, [initialNodes.length]);

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    applyLayout,
    graphHeight,
    setNodes,
    setEdges
  };
};

interface ActivityFlowProps {
  graphModel: GraphModel;
  className?: string;
}

const ActivityFlow: React.FC<ActivityFlowProps> = ({ graphModel, className = '' }) => {
  const dispatch = useAppDispatch();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { project } = useReactFlow();
  const initialNodeIdsRef = useRef<Set<string>>(new Set());

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [droppedPosition, setDroppedPosition] = useState<XYPosition | null>(null);

  // Transform activities to React Flow nodes
  const initialNodes: FlowNode[] = useMemo(() => {
    if (!graphModel?.activities?.length) return [];

    return graphModel.activities.map((activity: Activity) => ({
      id: activity.uid,
      type: activity.type,
      position: { x: 0, y: 0 },
      data: activity
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

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    applyLayout,
    graphHeight,
    setNodes
  } = useLayoutedElements(initialNodes, initialEdges);

  // Store current node IDs before opening dialog
  useEffect(() => {
    initialNodeIdsRef.current = new Set(nodes.map(node => node.id));
  }, [nodes]);

  // Add this handler for node clicks
  const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    const activity = node.data;

    if (activity) {
      dispatch(setSelectedActivity(activity));
      dispatch(setRightDrawerOpen(true));
    }
  }, [dispatch]);

  // Dialog handlers
  const handleDialogOpen = useCallback((): void => {
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((): void => {
    setDialogOpen(false);
  }, []);

  // Handle drag over
  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>): void => {
      event.preventDefault();

      if (reactFlowWrapper.current) {
        const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
        const dataTransfer = event.dataTransfer.getData('application/reactflow');

        if (!dataTransfer) return;

        // Get position of the drop
        const position = project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });

        // Store drop position
        setDroppedPosition(position);

        // Open dialog
        handleDialogOpen();
      }
    },
    [project, handleDialogOpen]
  );

  // Move the new node to the dropped position after dialog closes
  const handleActivitySubmit = useCallback(
    (): void => {
      if (!droppedPosition) return;

      // Get all current node IDs
      const currentNodeIds = new Set(nodes.map(node => node.id));

      // Find new nodes by comparing with initial IDs
      const newNodeIds = Array.from(currentNodeIds).filter(
        id => !initialNodeIdsRef.current.has(id)
      );

      if (newNodeIds.length > 0) {
        // Update position of the new node
        setNodes(currentNodes =>
          currentNodes.map(node => {
            if (newNodeIds.includes(node.id)) {
              return {
                ...node,
                position: droppedPosition
              };
            }
            return node;
          })
        );
      }

      // Close dialog
      handleDialogClose();
    },
    [droppedPosition, nodes, setNodes, handleDialogClose]
  );

  if (!graphModel) return null;

  return (
    <div className="flex">
      {/* Stencil Panel */}
      <div className="w-32 p-2 border-r border-gray-200 bg-gray-50">
        <h3 className="font-medium text-sm mb-2">Nodes</h3>
        <StencilActivityItem />
        <StencilMoleculeItem />
      </div>

      {/* Flow Canvas */}
      <div
        ref={reactFlowWrapper}
        className={`flex-1 ${className}`}
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
          onDragOver={onDragOver}
          onDrop={onDrop}
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

        {/* Custom Activity Dialog with Form */}
        <ActivityDialog
          open={dialogOpen}
          onClose={handleDialogClose}
          title="Add New Activity"
        >
          <ActivityForm
            onSubmit={handleActivitySubmit}
            onCancel={handleDialogClose}
          />
        </ActivityDialog>
      </div>
    </div>
  );
};

export default ActivityFlow;