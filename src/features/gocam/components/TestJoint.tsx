import type React from 'react';
import { useEffect, useRef } from 'react';
import * as joint from 'jointjs';
import 'jointjs/dist/joint.css';

const TestJoint: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1) Create the JointJS Graph
    const graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });

    // 2) Create the JointJS Paper (the main drawing surface)
    const paper = new joint.dia.Paper({
      el: containerRef.current,
      model: graph,
      width: 600,      // give it some width
      height: 400,     // give it some height
      gridSize: 10,    // optional grid
      drawGrid: true,  // show the grid
    });

    // 3) Create a basic shape
    const rect = new joint.shapes.standard.Rectangle({
      position: { x: 100, y: 100 },
      size: { width: 120, height: 60 },
      attrs: {
        body: {
          fill: '#DBEAFE',  // a light-blue fill
          stroke: '#3B82F6', // darker stroke
          strokeWidth: 2,
        },
        label: {
          text: 'Hello JointJS',
          fill: '#111827',
          fontWeight: 'bold',
          fontSize: 12,
        },
      },
    });

    // 4) Add it to the graph
    rect.addTo(graph);

    // Cleanup on unmount
    return () => {
      paper.remove();
      graph.clear();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      // Ensure this container can actually be seen.
      // For example, let Tailwind handle sizing:
      className="border border-gray-300 w-full h-full bg-red-300"
      style={{ minWidth: '600px', minHeight: '400px' }}
    />
  );
};

export default TestJoint;
