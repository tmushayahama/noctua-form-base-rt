import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Node as FlowNode, Edge as FlowEdge, XYPosition, Connection } from 'reactflow';
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
import 'reactflow/dist/style.css';
import { setRightDrawerOpen } from '@/@noctua.core/components/drawer/drawerSlice';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import ActivityDialog from '@/features/gocam/components/dialogs/ActivityFormDialog';
import ActivityForm from '@/features/gocam/components/forms/ActivityForm';
import type { GraphModel, Activity } from '@/features/gocam/models/cam';
import { setSelectedActivity } from '@/features/gocam/slices/camSlice';
import RelationForm from '@/features/relations/components/RelationForm';
import { StencilItem, nodeTypes } from './ActivityNodes';
import { FloatingEdge } from './FloatingEdge';
import { GRAPH_DIMENSIONS } from '../constants';
import { getLayoutedElements } from '../services/diagramServices';

const edgeTypes = {
  floating: FloatingEdge,
};

const useLayoutedElements = (initialNodes: FlowNode[], initialEdges: FlowEdge[], direction = 'TB') => {
  const { fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [graphHeight, setGraphHeight] = useState(GRAPH_DIMENSIONS.MIN_CONTAINER_HEIGHT);
  const [nodeHeights] = useState<Record<string, number>>({});
  const layouting = useRef(false);

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
  }, [initialNodes, initialEdges, direction, setNodes, setEdges, fitView, nodeHeights]);

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
  className?: string;
}

const ActivityFlow: React.FC<ActivityFlowProps> = ({ className = '' }) => {
  const dispatch = useAppDispatch();
  const graphModel = useAppSelector(state => state.cam.model);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const initialNodeIdsRef = useRef<Set<string>>(new Set());

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [droppedPosition, setDroppedPosition] = useState<XYPosition | null>(null);

  // Connection state
  const [sourceNode, setSourceNode] = useState<FlowNode | null>(null);
  const [targetNode, setTargetNode] = useState<FlowNode | null>(null);
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [relationDialogOpen, setRelationDialogOpen] = useState(false);

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
    setNodes,
    setEdges
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

  // Relation dialog handlers
  const handleRelationDialogOpen = useCallback((): void => {
    setRelationDialogOpen(true);
  }, []);

  const handleRelationDialogClose = useCallback((): void => {
    setRelationDialogOpen(false);
    setSourceNode(null);
    setTargetNode(null);
    setPendingConnection(null);
  }, []);

  // Connection handlers
  const onConnectStart = useCallback((event: React.MouseEvent, params: any) => {
    const { nodeId } = params;
    if (nodeId) {
      const source = nodes.find(n => n.id === nodeId);
      if (source) {
        setSourceNode(source);
      }
    }
  }, [nodes]);

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;

    const source = nodes.find(n => n.id === connection.source);
    const target = nodes.find(n => n.id === connection.target);

    if (source && target) {
      setSourceNode(source);
      setTargetNode(target);
      setPendingConnection(connection);
      handleRelationDialogOpen();
    }

    // Don't create the connection automatically
    return;
  }, [nodes, handleRelationDialogOpen]);

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
        const position = screenToFlowPosition({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });

        // Store drop position
        setDroppedPosition(position);

        // Open dialog
        handleDialogOpen();
      }
    },
    [screenToFlowPosition, handleDialogOpen]
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

  // Relation form submission handler
  const handleRelationSubmit = useCallback((relationData) => {
    if (!sourceNode || !targetNode || !pendingConnection) {
      console.error("Cannot create connection: missing source, target, or connection data");
      handleRelationDialogClose();
      return;
    }

    const newEdge = {
      id: `e${sourceNode.id}-${targetNode.id}`,
      source: pendingConnection.source,
      target: pendingConnection.target,
      sourceHandle: pendingConnection.sourceHandle,
      targetHandle: pendingConnection.targetHandle,
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
      label: relationData.label,
      labelStyle: {
        fill: '#374151',
        fontWeight: 500,
        fontSize: 11,
        backgroundColor: '#F3F4F6',
        padding: '2px 4px',
        borderRadius: '2px'
      },
      labelBgStyle: { fill: 'transparent' },
      data: {
        relationData,
        sourceData: sourceNode.data,
        targetData: targetNode.data
      },
    };

    // Add the new edge
    setEdges(eds => [...eds, newEdge]);

    // Close the dialog
    handleRelationDialogClose();
  }, [pendingConnection, sourceNode, targetNode, setEdges, handleRelationDialogClose]);

  if (!graphModel) return null;

  return (
    <div className="flex h-full">
      {/* Stencil Panel */}
      <div className="w-24 border-r p-1 border-gray-200 bg-gray-50">
        <div className="text-sm font-semibold text-gray-700 mb-4">TOOLBOX</div>
        <StencilItem
          type="activity"
          label="Activity Unit"
          imageSrc="assets/images/activity/default.png"
        />
        <StencilItem
          type="molecule"
          label="Molecule"
          imageSrc="assets/images/activity/molecule.png"
        />
        <StencilItem
          type="proteinComplex"
          label="Protein Complex"
          imageSrc="assets/images/activity/proteinComplex.png"
        />
      </div>

      {/* Flow Canvas */}
      <div
        ref={reactFlowWrapper}
        className={`flex-1 h-full bg-gray-50 ${className}`}
      // style={{ height: `${graphHeight}px` }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          nodeTypes={nodeTypes}
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
          <Background
            gap={20}
            size={1}
            color="#EEE"
            variant="lines"
          />
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

        {/* Relation Dialog with null checks */}
        <ActivityDialog
          open={relationDialogOpen}
          onClose={handleRelationDialogClose}
          title="Add New Relation"
        >
          {sourceNode && targetNode && (
            <RelationForm
              onSubmit={handleRelationSubmit}
              onCancel={handleRelationDialogClose}
              sourceActivity={sourceNode.data}
              targetActivity={targetNode.data}
            />
          )}
        </ActivityDialog>
      </div>
    </div>
  );
};

export default ActivityFlow;