import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { dia, shapes, util } from 'jointjs';
import { ActivityType } from '../models/cam';
import type { GraphModel, Activity } from '../models/cam';
import dagre from 'dagre';

// Helper function to safely break text
const safeBreakText = (text: string | undefined, options: { width: number }): string => {
  if (!text) return '';
  try {
    return util.breakText(text, options) || text;
  } catch {
    return text;
  }
};

const ActivityNodeShape = dia.Element.define('ActivityNode', {
  attrs: {
    body: {
      refWidth: '100%',
      refHeight: '100%',
      strokeWidth: 1,
      stroke: '#E5E7EB',
      fill: '#FFFFFF',
      rx: 8,
      ry: 8
    },
    label: {
      refX: '50%',
      refY: 10,
      textAnchor: 'middle',
      fontWeight: 'bold',
      fontSize: 12,
      fontFamily: 'sans-serif',
      fill: '#111827'
    },
    functionLabel: {
      refX: '50%',
      refY: 30,
      textAnchor: 'middle',
      fontSize: 10,
      fontFamily: 'sans-serif',
      fill: '#1E40AF'
    },
    enabledByLabel: {
      refX: '50%',
      refY: 50,
      textAnchor: 'middle',
      fontSize: 10,
      fontFamily: 'sans-serif',
      fill: '#166534'
    },
    dateLabel: {
      refX: '50%',
      refY: 90,
      textAnchor: 'middle',
      fontSize: 10,
      fontFamily: 'sans-serif',
      fill: '#6B7280'
    }
  }
}, {
  markup: [{
    tagName: 'rect',
    selector: 'body'
  }, {
    tagName: 'text',
    selector: 'label'
  }, {
    tagName: 'text',
    selector: 'functionLabel'
  }, {
    tagName: 'text',
    selector: 'enabledByLabel'
  }, {
    tagName: 'text',
    selector: 'dateLabel'
  }]
});

const MolecularNodeShape = dia.Element.define('MolecularNode', {
  attrs: {
    body: {
      refCx: '50%',
      refCy: '50%',
      r: 60,
      strokeWidth: 1,
      stroke: '#93C5FD',
      fill: '#DBEAFE'
    },
    label: {
      refX: '50%',
      refY: '50%',
      textAnchor: 'middle',
      fontWeight: 'bold',
      fontSize: 12,
      fontFamily: 'sans-serif',
      fill: '#111827'
    },
    dateLabel: {
      refX: '50%',
      refY: '70%',
      textAnchor: 'middle',
      fontSize: 10,
      fontFamily: 'sans-serif',
      fill: '#6B7280'
    }
  }
}, {
  markup: [{
    tagName: 'circle',
    selector: 'body'
  }, {
    tagName: 'text',
    selector: 'label'
  }, {
    tagName: 'text',
    selector: 'dateLabel'
  }]
});

interface ActivityFlowProps {
  graphModel: GraphModel;
}

const ActivityFlow: React.FC<ActivityFlowProps> = ({ graphModel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<dia.Graph | null>(null);
  const paperRef = useRef<dia.Paper | null>(null);

  // Apply Dagre layout to the graph
  const applyDagreLayout = (graph: dia.Graph) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 70 });

    // Add nodes to Dagre graph
    graph.getElements().forEach(element => {
      dagreGraph.setNode(element.id, {
        width: element.get('size')?.width || 200,
        height: element.get('size')?.height || 100
      });
    });

    // Add edges to Dagre graph
    graph.getLinks().forEach(link => {
      dagreGraph.setEdge(link.get('source').id, link.get('target').id);
    });

    // Run the layout
    dagre.layout(dagreGraph);

    // Update node positions in JointJS graph
    dagreGraph.nodes().forEach(nodeId => {
      const node = graph.getCell(nodeId);
      if (node) {
        const { x, y } = dagreGraph.node(nodeId);
        node.position(x - (node.get('size')?.width || 200) / 2, y - (node.get('size')?.height || 100) / 2);
      }
    });
  };

  // Initialize JointJS and handle data updates
  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize graph and paper only once
    if (!graphRef.current) {
      const graph = new dia.Graph({}, {
        cellNamespace: {
          ActivityNode: ActivityNodeShape,
          MolecularNode: MolecularNodeShape,
          standard: shapes.standard
        }
      });
      graphRef.current = graph;

      const paper = new dia.Paper({
        el: containerRef.current,
        model: graph,
        width: '100%',
        height: '100%',
        gridSize: 10,
        drawGrid: true,
        background: { color: '#F9FAFB' },
        frozen: true,
        async: true,
        sorting: dia.Paper.sorting.APPROX,
        cellViewNamespace: {
          ActivityNode: ActivityNodeShape,
          MolecularNode: MolecularNodeShape,
          standard: shapes.standard
        }
      });
      paperRef.current = paper;
    }

    const graph = graphRef.current;
    const paper = paperRef.current;

    if (!graph || !paper || !graphModel?.activities) return;

    // Freeze the paper during updates
    paper.freeze();

    // Clear existing cells
    graph.getCells().forEach(cell => cell.remove());

    const elementMap = new Map<string, dia.Element>();

    // Create nodes
    graphModel.activities.forEach(activity => {
      const isMolecular = activity.type === ActivityType.MOLECULE;
      const ElementType = isMolecular ? MolecularNodeShape : ActivityNodeShape;
      const element = new ElementType();

      const label = activity.molecularFunction?.label || activity.rootNode?.label || 'Unnamed Activity';

      if (isMolecular) {
        element.attr({
          label: { text: safeBreakText(label, { width: 100 }) },
          dateLabel: {
            text: activity.date ? new Date(activity.date).toLocaleDateString() : '',
            visibility: activity.date ? 'visible' : 'hidden'
          }
        });
        element.resize(120, 120);
      } else {
        element.attr({
          label: { text: safeBreakText(label, { width: 180 }) },
          functionLabel: {
            text: activity.molecularFunction ?
              `MF: ${safeBreakText(activity.molecularFunction.label, { width: 160 })}` : '',
            visibility: activity.molecularFunction ? 'visible' : 'hidden'
          },
          enabledByLabel: {
            text: activity.enabledBy ?
              `Enabled By: ${safeBreakText(activity.enabledBy.label, { width: 160 })}` : '',
            visibility: activity.enabledBy ? 'visible' : 'hidden'
          },
          dateLabel: {
            text: activity.date ? new Date(activity.date).toLocaleDateString() : '',
            visibility: activity.date ? 'visible' : 'hidden'
          }
        });
        element.resize(200, 120);
      }

      element.addTo(graph);
      elementMap.set(activity.uid, element);
    });

    // Create edges
    graphModel.activityConnections?.forEach(connection => {
      const source = elementMap.get(connection.sourceId);
      const target = elementMap.get(connection.targetId);

      if (source && target) {
        const link = new shapes.standard.Link();
        link.source(source);
        link.target(target);
        link.attr({
          line: {
            stroke: '#6366F1',
            strokeWidth: 2,
            targetMarker: {
              'type': 'path',
              'd': 'M 10 -5 0 0 10 5 z',
              'fill': '#6366F1'
            }
          },
          label: {
            text: connection.label || '',
            fill: '#374151',
            fontWeight: '500',
            fontSize: 11,
            textAnchor: 'middle',
            yAlignment: 'middle',
            stroke: '#F3F4F6',
            strokeWidth: 5,
            paintOrder: 'stroke'
          }
        });
        link.addTo(graph);
      }
    });

    // Apply Dagre layout
    applyDagreLayout(graph);

    // Unfreeze and fit content after update
    requestAnimationFrame(() => {
      if (paperRef.current) {
        paper.unfreeze();
        paper.fitToContent({
          padding: 50,
          allowNewOrigin: 'any',
          useModelGeometry: true
        });
      }
    });

    // Proper cleanup
    return () => {
      // We don't clear the graph here to prevent the "unfreeze after removal" error
      // The graph and paper will be automatically cleaned up when the component unmounts
    };
  }, [graphModel]);

  return (
    <div className="w-full h-full border border-gray-200 rounded-md">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};


export default ActivityFlow;