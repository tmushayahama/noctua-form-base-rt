import { useRef, useState, useEffect } from "react";
import type { NodeTypes } from 'reactflow';
import { Handle, Position } from 'reactflow';
import { GRAPH_DIMENSIONS } from "../constants";

// Stencil item components

interface StencilItemProps {
  type: 'activity' | 'molecule' | 'proteinComplex';
  label: string;
  imageSrc: string;
}

export const StencilItem = ({ type, label, imageSrc }: StencilItemProps): JSX.Element => {
  const onDragStart = (event: React.DragEvent<HTMLDivElement>): void => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ type }));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className="flex flex-col items-center align-middle border-2 border-primary-200 rounded-lg p-1 py-3 mb-2 cursor-grab"
      onDragStart={onDragStart}
      draggable
    >
      <div className="flex items-center justify-center h-12 w-12 mb-2">
        <img src={imageSrc} alt={label} className="w-full" />
      </div>
      <div className="w-full text-3xs text-center font-medium uppercase">{label}</div>
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

  const handleStyle = {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: '8px',
    border: '5px solid blue',
    background: 'none',
    pointerEvents: 'all',
    cursor: 'crosshair'
  };

  return (
    <div
      ref={nodeRef}
      className="rounded-lg shadow-md border border-gray-200 bg-green-100 overflow-visible relative"
      style={{ width: GRAPH_DIMENSIONS.NODE_WIDTH, minHeight: nodeHeight }}
    >
      <Handle
        type="source"
        position={Position.Top}
        id="perimeter-handle"
        style={handleStyle}
        isConnectable={true}
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
  proteinComplex: ActivityNode,
};

