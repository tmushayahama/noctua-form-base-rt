import * as joint from 'jointjs'
import * as dagre from 'dagre'
import { NodeCellList, NodeLink, registerShapes } from './shapes'
import { getEdgeColor } from './edgeDisplayService'
import type { GraphModel, Activity, Edge } from '@/features/gocam/models/cam'
import { ActivityType } from '@/features/gocam/models/cam'

// Map activity type to a color key used in the Material palette
function activityColorKey(activity: Activity): string {
  switch (activity.type) {
    case ActivityType.MOLECULE:
      return 'brown'
    case ActivityType.PROTEIN_COMPLEX:
      return 'purple'
    default:
      return 'green'
  }
}

export class CamCanvas {
  paper: joint.dia.Paper
  graph: joint.dia.Graph
  private _wrapper: HTMLDivElement

  // Event callbacks — wired by the React component
  onActivityClick?: (activityId: string) => void

  constructor(container: HTMLElement) {
    registerShapes()

    // Create a wrapper div so paper.remove() doesn't destroy the React-managed container
    this._wrapper = document.createElement('div')
    this._wrapper.style.width = '100%'
    this._wrapper.style.height = '100%'
    container.appendChild(this._wrapper)

    this.graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes })
    this.paper = new joint.dia.Paper({
      cellViewNamespace: joint.shapes,
      el: this._wrapper,
      height: '100%',
      width: '100%',
      model: this.graph,
      restrictTranslate: true,
      multiLinks: false,
      markAvailable: true,
      validateConnection(cellViewS, _magnetS, cellViewT) {
        if (cellViewS === cellViewT) return false
        return true
      },
      validateMagnet() {
        return true
      },
      defaultConnectionPoint: { name: 'boundary', args: { sticky: true } },
      defaultConnector: { name: 'smooth' },
      async: true,
      interactive: { labelMove: false },
      linkPinning: false,
      gridSize: 10,
      drawGrid: {
        name: 'doubleMesh',
        args: [
          { color: '#DDDDDD', thickness: 1 },
          { color: '#DDDDDD', scaleFactor: 5, thickness: 4 },
        ],
      },
      sorting: joint.dia.Paper.sorting.APPROX,
    })

    this._initEvents()
  }

  private _initEvents() {
    this.paper.on('blank:pointerdblclick', () => {
      this._unselectAll()
    })

    this.paper.on(
      'element:pointerdblclick',
      (cellView: joint.dia.CellView) => {
        const element = cellView.model
        const activity = element.prop('activity') as Activity | undefined
        if (activity) {
          this._selectNode(element as NodeCellList)
          this.onActivityClick?.(activity.uid)
        }
      }
    )

    this.paper.on('element:mouseover', (cellView: joint.dia.CellView) => {
      const element = cellView.model
      if (element instanceof NodeCellList) {
        element.hover(true)
      }
    })

    this.paper.on('element:mouseleave', (cellView: joint.dia.CellView) => {
      const element = cellView.model
      if (element instanceof NodeCellList) {
        element.hover(false)
      }
    })

    this.paper.on('link:mouseenter', (cellView: joint.dia.CellView) => {
      const element = cellView.model
      if (element instanceof NodeLink) {
        element.hover(true)
      }
    })

    this.paper.on('link:mouseleave', (cellView: joint.dia.CellView) => {
      const element = cellView.model
      if (element instanceof NodeLink) {
        element.hover(false)
      }
    })
  }

  // ── Public API ──────────────────────────────────────────────────

  addCanvasGraph(model: GraphModel) {
    const cells: joint.dia.Cell[] = []

    for (const activity of model.activities) {
      const el = this._createNode(activity)
      cells.push(el)
    }

    if (model.activityConnections) {
      for (const conn of model.activityConnections) {
        const link = this._createLink(conn)
        if (link) cells.push(link)
      }
    }

    this.graph.resetCells(cells)
    this.autoLayout('compact')
    this.paper.unfreeze()
  }

  autoLayout(spacing: 'compact' | 'relaxed' = 'compact') {
    const elements = this.graph
      .getElements()
      .filter(el => el.attr('./visibility') !== 'hidden')
    if (elements.length === 0) return

    const subgraph = this.graph.getSubgraph(elements)
    const opts =
      spacing === 'compact'
        ? { rankSep: 50, marginX: 10, marginY: 10 }
        : { rankSep: 200, marginX: 50, marginY: 50 }

    joint.layout.DirectedGraph.layout(subgraph, {
      dagre,
      graphlib: dagre.graphlib,
      align: 'UL',
      setLabels: true,
      ranker: 'network-simplex',
      rankDir: 'TB',
      ...opts,
    })
  }

  zoom(delta: number) {
    const currentScale = this.paper.scale().sx
    const newScale = currentScale + delta
    if (newScale > 0.1 && newScale < 10) {
      this.paper.scale(newScale, newScale)
    }
  }

  resetZoom() {
    this.paper.scale(1, 1)
  }

  destroy() {
    this.paper.remove()
  }

  // ── Private helpers ─────────────────────────────────────────────

  private _createNode(activity: Activity): NodeCellList {
    const el = new NodeCellList()

    // Header: gene product (enabledBy) or root node
    const gpLabel =
      activity.enabledBy?.label ?? activity.rootNode?.label ?? 'Unknown'
    el.addHeader(gpLabel)

    // Body: molecular function
    if (activity.molecularFunction) {
      el.addEntity('', activity.molecularFunction.label, true)
    }

    // Additional edges as entity rows
    for (const edge of activity.edges ?? []) {
      if (edge.target?.label) {
        el.addEntity(edge.label ?? '', edge.target.label, true)
      }
    }

    el.setColor(activityColorKey(activity))

    el.set({
      activity,
      id: activity.uid,
    })

    return el
  }

  private _createLink(conn: Edge): NodeLink | null {
    if (!conn.sourceId || !conn.targetId) return null

    const link = NodeLink.create()
    link.setText(conn.label ?? '')
    link.set({
      source: { id: conn.sourceId },
      target: { id: conn.targetId },
    })

    const color = getEdgeColor(conn.id ?? '')
    link.attr('line/stroke', color)
    link.attr('line/targetMarker/stroke', color)
    link.attr('line/targetMarker/fill', color)

    return link
  }

  private _selectNode(node: NodeCellList) {
    this._unselectAll()
    node.setBorder('orange', 500)
  }

  private _unselectAll() {
    for (const cell of this.graph.getCells()) {
      if (cell instanceof NodeCellList) {
        cell.unsetBorder()
      }
    }
  }
}
