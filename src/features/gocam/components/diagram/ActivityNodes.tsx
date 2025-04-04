import { useRef, useState, useEffect } from "react";
import type { NodeTypes } from 'reactflow';
import { Handle, Position } from 'reactflow';
import { GRAPH_DIMENSIONS } from "../../constants";

// Stencil item components
export const StencilActivityItem = (): JSX.Element => {
  const onDragStart = (event: React.DragEvent<HTMLDivElement>): void => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ type: 'activity' }));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className="bg-green-100 border border-gray-200 rounded-lg p-2 mb-2 cursor-grab"
      onDragStart={onDragStart}
      draggable
    >
      <div className="text-sm font-medium">Activity Node</div>
    </div>
  );
};

export const StencilMoleculeItem = (): JSX.Element => {
  const onDragStart = (event: React.DragEvent<HTMLDivElement>): void => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ type: 'molecule' }));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className="bg-blue-100 border border-blue-300 rounded-full flex items-center justify-center p-2 mb-2 cursor-grab"
      style={{ width: '80px', height: '80px' }}
      onDragStart={onDragStart}
      draggable
    >
      <div className="text-sm font-medium text-center">Molecule</div>
    </div>
  );
};

export const ActivityNode = ({ data }: { data: any }) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [nodeHeight, setNodeHeight] = useState(140);

  useEffect(() => {
    if (nodeRef.current) {
      const contentHeight = nodeRef.current.scrollHeight;
      setNodeHeight(contentHeight);

      // If this node is part of a layout operation, we need to notify the parent
      if (data.onHeightChange) {
        data.onHeightChange(data.uid, contentHeight);
      }
    }
  }, [data]);

  const renderEdges = (edges: any[], level = 0) => {
    if (!edges || edges.length === 0) return null;

    return (
      <div className={`${level > 0 ? 'ml-3 border-l-2 border-gray-200 pl-2' : ''}`}>
        {edges.map((edge: any) => (
          <div key={edge.id} className="mb-2">
            <div className="flex items-center border-white border-b-2">
              <span className="mr-1 text-2xs text-gray-400">→</span>
              <span className="text-2xs text-gray-700 font-thin w-[60px] line-clamp-2">{edge.label}</span>
              <span className="text-xs flex-1 line-clamp-2">{edge.target.label}</span>
            </div>

            {edge.edges && renderEdges(edge.edges, level + 1)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      ref={nodeRef}
      className="rounded-lg shadow-md border border-gray-200 bg-green-100 overflow-visible"
      style={{ width: GRAPH_DIMENSIONS.NODE_WIDTH, minHeight: nodeHeight }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        style={{ top: 0 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        style={{ bottom: 0 }}
      />

      {data.enabledBy && (
        <div className="text-sm font-semibold text-gray-700 p-2 border-white border-b-2">
          <div>{data.enabledBy.label}</div>
        </div>
      )}

      {data.molecularFunction && (
        <div className="text-xs text-gray-700 p-2 border-white border-b-2">
          <div>{data.molecularFunction.label}</div>
        </div>
      )}

      {data.edges && data.edges.length > 0 && (
        <div className="">
          {renderEdges(data.edges)}
        </div>
      )}
    </div>
  );
};

export const MolecularNode = ({ data }: { data: any }) => {
  return (
    <div
      className="flex items-center justify-center rounded-full shadow-md bg-blue-100 border border-blue-300"
      style={{ width: GRAPH_DIMENSIONS.MOLECULAR_NODE_SIZE, height: GRAPH_DIMENSIONS.MOLECULAR_NODE_SIZE }}
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

export const nodeTypes: NodeTypes = {
  activity: ActivityNode,
  molecule: MolecularNode,
};

