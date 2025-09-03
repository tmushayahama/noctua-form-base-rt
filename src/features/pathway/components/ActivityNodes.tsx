import { useRef, useEffect } from 'react';
import type { NodeTypes } from 'reactflow';
import { Handle, Position } from 'reactflow';
import type { Activity } from '@/features/gocam/models/cam';
import { GRAPH_DIMENSIONS } from '../constants';

interface NodeProps {
  data: Activity;
}

export const ActivityNode = ({ data }: NodeProps) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (nodeRef.current && data.onHeightChange) {
      data.onHeightChange(data.uid, nodeRef.current.scrollHeight);
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
      style={{ width: GRAPH_DIMENSIONS.NODE_WIDTH }}
    >
      <Handle type="target" position={Position.Top} id="top-target" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" />

      {data.enabledBy && (
        <div className="text-sm font-semibold text-gray-700 p-2 border-white border-b-2">
          {data.enabledBy.label}
        </div>
      )}

      {data.molecularFunction && (
        <div className="text-xs text-gray-700 p-2 border-white border-b-2">
          {data.molecularFunction.label}
        </div>
      )}

      {data.edges && data.edges.length > 0 && (
        <div className="p-2">
          {renderEdges(data.edges)}
        </div>
      )}
    </div>
  );
};

export const MoleculeNode = ({ data }: NodeProps) => {
  return (
    <div
      className="flex items-center justify-center rounded-full shadow-md bg-blue-100 border border-blue-300"
      style={{ width: GRAPH_DIMENSIONS.MOLECULAR_NODE_SIZE, height: GRAPH_DIMENSIONS.MOLECULAR_NODE_SIZE }}
    >
      <Handle type="target" position={Position.Top} id="top-target" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" />
      <div className="text-center p-2">
        <div className="font-semibold text-sm">{data.rootNode.label}</div>
      </div>
    </div>
  );
};

export const nodeTypes: NodeTypes = {
  activity: ActivityNode,
  molecule: MoleculeNode,
  proteinComplex: ActivityNode,
};