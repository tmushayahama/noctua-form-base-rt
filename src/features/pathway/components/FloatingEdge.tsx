import { getBezierPath } from 'reactflow';

export const FloatingEdge = ({
  id,
  source,
  target,
  markerEnd,
  style,
  data
}: any) => {
  if (!source || !target) return null;

  const [edgePath] = getBezierPath({
    sourceX: source.x,
    sourceY: source.y,
    sourcePosition: source.position,
    targetX: target.x,
    targetY: target.y,
    targetPosition: target.position,
  });

  return (
    <path
      id={id}
      className="react-flow__edge-path"
      d={edgePath}
      strokeWidth={1}
      stroke="#6366F1"
      markerEnd={markerEnd}
      style={style}
    />
  );
};