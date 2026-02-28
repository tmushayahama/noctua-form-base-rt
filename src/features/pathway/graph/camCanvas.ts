import * as joint from 'jointjs'
import * as dagre from 'dagre'
import { NodeCellList, NodeCellMolecule, NodeLink, registerShapes } from './shapes'
import { getEdgeColor } from './edgeDisplayService'
import type { GraphModel, Activity, Edge } from '@/features/gocam/models/cam'
import { ActivityType } from '@/features/gocam/models/cam'

export type LayoutDetail = 'detailed' | 'activity' | 'simple'
export type LayoutSpacing = 'compact' | 'relaxed'

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
  private _layoutChanged = false

  // Event callbacks — wired by the React component
  onActivityClick?: (activityId: string) => void
  onEditClick?: (activityId: string) => void
  onDeleteClick?: (activityId: string) => void
  onLinkClick?: (sourceId: string, targetId: string) => void
  onLinkCreated?: (sourceId: string, targetId: string) => void
  onUpdateLocations?: (positions: Record<string, { x: number; y: number }>) => void

  constructor(container: HTMLElement) {
    registerShapes()

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
      defaultLink: () => NodeLink.create(),
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
    // ── Blank canvas double-click: deselect all ──
    this.paper.on('blank:pointerdblclick', () => {
      this._unselectAll()
    })

    // ── Element double-click: select + notify ──
    this.paper.on('element:pointerdblclick', (cellView: joint.dia.CellView) => {
      const element = cellView.model
      const activity = element.prop('activity') as Activity | undefined
      if (activity) {
        this._selectNode(element as NodeCellList)
        this.onActivityClick?.(activity.uid)
      }
    })

    // ── Element hover: highlight successor/predecessor nodes ──
    this.paper.on('element:mouseover', (cellView: joint.dia.CellView) => {
      const element = cellView.model
      if (element instanceof NodeCellList) {
        element.hover(true)
        this._highlightSuccessorNodes(element)
      } else if (element instanceof NodeCellMolecule) {
        element.hover(true)
      }
    })

    this.paper.on('element:mouseleave', (cellView: joint.dia.CellView) => {
      const element = cellView.model
      if (element instanceof NodeCellList) {
        element.hover(false)
        this._unhighlightAllNodes()
      } else if (element instanceof NodeCellMolecule) {
        element.hover(false)
      }
    })

    // ── Link hover ──
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

    // ── Link double-click: open connector form ──
    this.paper.on('link:pointerdblclick', (cellView: joint.dia.CellView) => {
      const link = cellView.model
      const sourceId = link.get('source')?.id as string | undefined
      const targetId = link.get('target')?.id as string | undefined
      if (sourceId && targetId) {
        this._unselectAll()
        this.onLinkClick?.(sourceId, targetId)
      }
    })

    // ── New link creation (drag between nodes) ──
    this.graph.on('change:source change:target', (link: joint.dia.Cell) => {
      const sourceId = link.get('source')?.id as string | undefined
      const targetId = link.get('target')?.id as string | undefined
      if (sourceId && targetId) {
        this.onLinkCreated?.(sourceId, targetId)
      }
    })

    // ── Position tracking ──
    this.graph.on('change:position', () => {
      this._layoutChanged = true
    })

    this.paper.on('element:pointerup', () => {
      if (this._layoutChanged) {
        this._layoutChanged = false
        this._persistPositions()
      }
    })
  }

  // ── Public API ──────────────────────────────────────────────────

  addCanvasGraph(
    model: GraphModel,
    layoutDetail: LayoutDetail = 'detailed',
    spacing: LayoutSpacing = 'compact'
  ) {
    const cells: joint.dia.Cell[] = []

    for (const activity of model.activities) {
      if (activity.type === ActivityType.MOLECULE) {
        cells.push(this._createMolecule(activity))
      } else {
        cells.push(this._createNode(activity, layoutDetail))
      }
    }

    if (model.activityConnections) {
      for (const conn of model.activityConnections) {
        const link = this._createLink(conn)
        if (link) cells.push(link)
      }
    }

    this.paper.setDimensions('30000px', '30000px')
    this.graph.resetCells(cells)
    this.autoLayout(spacing)
    this.paper.scaleContentToFit({
      minScaleX: 0.3,
      minScaleY: 0.3,
      maxScaleX: 1,
      maxScaleY: 1,
    })
    this.paper.unfreeze()
  }

  autoLayout(spacing: LayoutSpacing = 'compact') {
    const elements = this.graph.getElements().filter(el => el.attr('./visibility') !== 'hidden')
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

  zoom(delta: number, event?: MouseEvent) {
    const currentScale = this.paper.scale().sx
    const newScale = currentScale + delta
    if (newScale > 0.1 && newScale < 10) {
      if (event) {
        const el = this.paper.el as HTMLElement
        const rect = el.getBoundingClientRect()
        const offsetX = event.clientX - rect.left
        const offsetY = event.clientY - rect.top
        const localPoint = this._offsetToLocalPoint(offsetX, offsetY)
        this.paper.translate(0, 0)
        this.paper.scale(newScale, newScale, localPoint.x, localPoint.y)
      } else {
        this.paper.scale(newScale, newScale)
      }
    }
  }

  resetZoom() {
    this.paper.scale(1, 1)
  }

  toggleActivityVisibility(activityId: string) {
    const cell = this.graph.getCell(activityId)
    if (!cell || !(cell instanceof joint.dia.Element)) return

    const activity = cell.prop('activity') as Activity | undefined
    if (!activity) return

    const successors = this.graph.getSuccessors(cell)
    const elements = [...successors, cell]
    const subgraph = this.graph.getSubgraph(elements)
    const isExpanded = cell.prop('expanded') !== false

    if (isExpanded) {
      subgraph.forEach(element => {
        element.attr('./visibility', 'hidden')
      })
    } else {
      subgraph.forEach(element => {
        element.attr('./visibility', 'visible')
      })
    }

    cell.attr('./visibility', 'visible')
    cell.prop('expanded', !isExpanded)
    this.autoLayout('compact')
    this.paper.translate(0, 0)
  }

  destroy() {
    this.paper.remove()
  }

  // ── Highlighting ──────────────────────────────────────────────

  private _highlightSuccessorNodes(node: joint.dia.Element) {
    this._unhighlightAllNodes()

    const predecessors = this.graph.getPredecessors(node)
    const successors = this.graph.getSuccessors(node)

    // Grey out all nodes
    for (const cell of this.graph.getElements()) {
      if (cell instanceof NodeCellList) {
        cell.setColor('grey', 200, 300)
      }
    }

    // Amber for successors
    for (const cell of successors) {
      if (cell instanceof NodeCellList) {
        cell.setColor('amber', 200, 300)
      }
    }

    // Yellow for predecessors
    for (const cell of predecessors) {
      if (cell instanceof NodeCellList) {
        cell.setColor('yellow', 50, 100)
      }
    }

    // Bright yellow for hovered node
    if (node instanceof NodeCellList) {
      node.setColor('yellow', 100, 200)
    }
  }

  private _unhighlightAllNodes() {
    for (const cell of this.graph.getElements()) {
      if (cell instanceof NodeCellList) {
        const colorKey = (cell.prop('colorKey') as string) ?? 'green'
        cell.setColor(colorKey)
      }
    }
  }

  // ── Position persistence ──────────────────────────────────────

  private _persistPositions() {
    const positions: Record<string, { x: number; y: number }> = {}
    for (const element of this.graph.getElements()) {
      const activity = element.prop('activity') as Activity | undefined
      if (activity) {
        const pos = element.position()
        positions[activity.uid] = { x: pos.x, y: pos.y }
      }
    }
    this.onUpdateLocations?.(positions)
  }

  // ── Node/Link creation ────────────────────────────────────────

  private _createNode(activity: Activity, layoutDetail: LayoutDetail = 'detailed'): NodeCellList {
    const el = new NodeCellList()
    const colorKey = activityColorKey(activity)

    const gpLabel = activity.enabledBy?.label ?? activity.rootNode?.label ?? 'Unknown'
    el.addHeader(gpLabel)

    if (layoutDetail === 'detailed') {
      if (activity.molecularFunction) {
        el.addEntity('', activity.molecularFunction.label, true)
      }
      for (const edge of activity.edges ?? []) {
        if (edge.target?.label) {
          el.addEntity(edge.label ?? '', edge.target.label, true)
        }
      }
    } else if (layoutDetail === 'activity') {
      if (activity.molecularFunction) {
        el.addEntity('', activity.molecularFunction.label, true)
      }
    }
    // 'simple' layout: header only, no entity rows

    el.setColor(colorKey)
    el.set({
      activity,
      colorKey,
      id: activity.uid,
    })

    return el
  }

  private _createMolecule(activity: Activity): NodeCellMolecule {
    const el = new NodeCellMolecule()
    const colorKey = activityColorKey(activity)

    let label = activity.rootNode?.label ?? 'Unknown'
    // Check for cellular component edges to add location info
    for (const edge of activity.edges ?? []) {
      if (edge.target?.label && edge.target.rootTypes?.includes('GO:0005575')) {
        label += `\nlocated in: ${edge.target.label}`
        break
      }
    }

    el.setText(label)
    el.setColor(colorKey)
    el.resize(120, 120)
    el.set({
      activity,
      colorKey,
      id: activity.uid,
    })

    return el
  }

  private _createLink(conn: Edge): NodeLink | null {
    if (!conn.sourceId || !conn.targetId) return null

    const link = NodeLink.create()

    if (conn.isReverseLink && conn.reverseLinkLabel) {
      link.setText(conn.reverseLinkLabel)
      link.set({
        source: { id: conn.targetId },
        target: { id: conn.sourceId },
      })
    } else {
      link.setText(conn.label ?? '')
      link.set({
        source: { id: conn.sourceId },
        target: { id: conn.targetId },
      })
    }

    const color = getEdgeColor(conn.id ?? '')
    link.attr('line/stroke', color)
    link.attr('line/targetMarker/stroke', color)
    link.attr('line/targetMarker/fill', color)

    return link
  }

  // ── Selection ─────────────────────────────────────────────────

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

  // ── Coordinate transform ──────────────────────────────────────

  private _offsetToLocalPoint(x: number, y: number): { x: number; y: number } {
    const svgPoint = (this.paper.svg as SVGSVGElement).createSVGPoint()
    svgPoint.x = x
    svgPoint.y = y
    const ctm = (this.paper as any).viewport.getCTM()
    if (ctm) {
      const transformed = svgPoint.matrixTransform(ctm.inverse())
      return { x: transformed.x, y: transformed.y }
    }
    return { x, y }
  }
}
