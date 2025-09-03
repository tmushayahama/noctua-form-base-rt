import { useAppDispatch, useAppSelector } from "@/app/hooks";
import ActivityDialog from "@/features/gocam/components/dialogs/ActivityFormDialog";
import ActivityForm from "@/features/gocam/components/forms/ActivityForm";
import { setSelectedActivity, addActivity } from "@/features/gocam/slices/camSlice";
import RelationForm from "@/features/relations/components/RelationForm";
import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import type { Connection } from "reactflow";
import ReactFlow, { useReactFlow, useNodesState, useEdgesState, MarkerType, Background, Controls, addEdge } from "reactflow";
import { ActivityNode, MoleculeNode } from "./ActivityNodes";
import { FloatingEdge } from "./FloatingEdge";
import { StencilPanel } from "./StencilPanel";


const nodeTypes = {
  activity: ActivityNode,
  molecule: MoleculeNode,
  proteinComplex: ActivityNode,
};

const edgeTypes = {
  floating: FloatingEdge,
};

export const ActivityFlow = () => {
  const dispatch = useAppDispatch();
  const graphModel = useAppSelector(state => state.cam.model);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [relationDialogOpen, setRelationDialogOpen] = useState(false);
  const [droppedPosition, setDroppedPosition] = useState<{ x: number; y: number } | null>(null);
  const [sourceNode, setSourceNode] = useState<Node | null>(null);
  const [targetNode, setTargetNode] = useState<Node | null>(null);

  const initialNodes = useMemo(() => {
    if (!graphModel?.activities) return [];
    return graphModel.activities.map((activity) => ({
      id: activity.uid,
      type: activity.type,
      data: activity,
      position: { x: 0, y: 0 },
      draggable: true,
    }));
  }, [graphModel?.activities]);

  const initialEdges = useMemo(() => {
    if (!graphModel?.activityConnections) return [];
    return graphModel.activityConnections.map((connection, index) => ({
      id: `${connection.id}-${index}`,
      source: connection.sourceId,
      target: connection.targetId,
      type: 'floating',
      data: connection,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#6366F1',
      },
      style: { stroke: '#6366F1', strokeWidth: 2 },
    }));
  }, [graphModel?.activityConnections]);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    dispatch(setSelectedActivity(node.data));
  }, [dispatch]);

  const onConnect = useCallback((params: Connection) => {
    const source = nodes.find(n => n.id === params.source);
    const target = nodes.find(n => n.id === params.target);
    if (source && target) {
      setSourceNode(source);
      setTargetNode(target);
      setRelationDialogOpen(true);
    }
  }, [nodes]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (!reactFlowWrapper.current) return;

    const position = screenToFlowPosition({
      x: event.clientX - reactFlowWrapper.current.getBoundingClientRect().left,
      y: event.clientY - reactFlowWrapper.current.getBoundingClientRect().top,
    });

    setDroppedPosition(position);
    setDialogOpen(true);
  }, [screenToFlowPosition]);

  if (!graphModel) return null;

  return (
    <div className="flex h-full">
      <StencilPanel />
      <div ref={reactFlowWrapper} className="flex-1 h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          minZoom={0.1}
          maxZoom={4}
          fitView
          defaultEdgeOptions={{
            type: 'floating',
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#6366F1',
            },
          }}
        >
          <Background gap={12} size={1} />
          <Controls />
        </ReactFlow>

        <ActivityDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="Add New Activity"
        >
          <ActivityForm
            onSubmit={(activity) => {
              dispatch(addActivity(activity));
              setDialogOpen(false);
            }}
            onCancel={() => setDialogOpen(false)}
          />
        </ActivityDialog>

        {sourceNode && targetNode && (
          <ActivityDialog
            open={relationDialogOpen}
            onClose={() => setRelationDialogOpen(false)}
            title="Add New Relation"
          >
            <RelationForm
              sourceActivity={sourceNode.data}
              targetActivity={targetNode.data}
              onSubmit={(relation) => {
                dispatch(addEdge(relation));
                setRelationDialogOpen(false);
              }}
              onCancel={() => setRelationDialogOpen(false)}
            />
          </ActivityDialog>
        )}
      </div>
    </div>
  );
};