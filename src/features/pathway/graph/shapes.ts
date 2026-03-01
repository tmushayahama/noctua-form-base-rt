import * as joint from 'jointjs'
import { getColor } from './colors'

// ── Constants ──────────────────────────────────────────────────────

const GRID_SIZE = 8
const PADDING_L = GRID_SIZE * 2
const FONT_FAMILY = 'sans-serif'

const HEADER_ICON_SIZE = 30
const HEADER_HEIGHT = 40

export const LIST_GROUP_NAME = 'list'
const LIST_ITEM_HEIGHT = 35
export const LIST_ITEM_WIDTH = 200
const LIST_ITEM_GAP = 0

// ── Port item layout ──────────────────────────────────────────────

const itemPosition = (
  portsArgs: joint.dia.Element.Port[],
  elBBox: joint.dia.BBox
): joint.g.Point[] => {
  return portsArgs.map((_port, index, { length }) => {
    const bottom =
      elBBox.height - (LIST_ITEM_HEIGHT + 20) / 2 - GRID_SIZE
    const y = (length - 1 - index) * (LIST_ITEM_HEIGHT + LIST_ITEM_GAP)
    return new joint.g.Point(0, bottom - y)
  })
}

// ── Port item attributes ──────────────────────────────────────────

const itemAttributes = {
  attrs: {
    body: {
      width: 'calc(w)',
      height: 'calc(h)',
      x: '0',
      y: 'calc(-0.5*h)',
      fill: 'transparent',
      stroke: 'white',
      strokeWidth: 1,
    },
    relationship: {
      width: 60,
      pointerEvents: 'none',
      fontFamily: FONT_FAMILY,
      fontWeight: 400,
      fontSize: 9,
      fill: 'black',
      textAnchor: 'start',
      textVerticalAnchor: 'middle',
      textWrap: { width: 60, maxLineCount: 2, ellipsis: true },
      x: 8,
    },
    portLabel: {
      width: 100,
      pointerEvents: 'none',
      fontFamily: FONT_FAMILY,
      fontSize: 12,
      fill: 'black',
      textAnchor: 'start',
      textVerticalAnchor: 'middle',
      textWrap: { width: 140, maxLineCount: 2, ellipsis: true },
      x: 60,
    },
  },
  size: { width: LIST_ITEM_WIDTH, height: LIST_ITEM_HEIGHT },
  markup: [
    { tagName: 'rect', selector: 'body' },
    { tagName: 'text', selector: 'relationship' },
    { tagName: 'text', selector: 'portLabel' },
  ],
}

// ── Header attributes (for NodeCellList) ──────────────────────────

const headerMarkup = [
  { tagName: 'rect', selector: 'wrapper' },
  { tagName: 'rect', selector: 'highlighter' },
  { tagName: 'rect', selector: 'body' },
  { tagName: 'text', selector: 'label' },
  { tagName: 'image', selector: 'icon' },
  { tagName: 'image', selector: 'editIcon' },
  { tagName: 'image', selector: 'deleteIcon' },
]

const headerAttributes = {
  attrs: {
    root: { magnet: true },
    wrapper: {
      magnet: true,
      refWidth: '100%',
      refHeight: '100%',
      fill: 'transparent',
      stroke: 'rgba(0,0,255,0.3)',
      strokeWidth: 0,
    },
    highlighter: {
      refWidth: '100%',
      refHeight: '100%',
      fill: 'none',
      stroke: 'transparent',
      strokeWidth: 10,
    },
    body: {
      width: 'calc(w)',
      height: 'calc(h)',
    },
    icon: {
      width: HEADER_ICON_SIZE,
      height: HEADER_ICON_SIZE,
      x: 5,
      y: (HEADER_HEIGHT - HEADER_ICON_SIZE) / 2,
    },
    label: {
      x: 40,
      y: 15,
      fontFamily: FONT_FAMILY,
      fontWeight: 600,
      fontSize: 12,
      fill: 'black',
      text: 'Label',
      textWrap: { width: '90%', maxLineCount: 1, ellipsis: true },
      textVerticalAnchor: 'top',
    },
    editIcon: {
      event: 'element:edit:pointerdown',
      xlinkHref: './assets/icons/edit.svg',
      ref: 'wrapper',
      refX: '100%',
      refX2: 5,
      y: 0,
      width: 20,
      height: 20,
      cursor: 'pointer',
      visibility: 'hidden',
    },
    deleteIcon: {
      event: 'element:delete:pointerdown',
      xlinkHref: './assets/icons/delete.svg',
      ref: 'wrapper',
      refX: '100%',
      refX2: 5,
      y: 30,
      width: 20,
      height: 20,
      cursor: 'pointer',
      visibility: 'hidden',
    },
  },
  markup: headerMarkup,
}

// ── NodeCellList ──────────────────────────────────────────────────
// Port-based list element: header + dynamic entity rows.
// Mirrors Angular `@noctua.graph/models/shapes/list.ts`.

export class NodeCellList extends joint.dia.Element {
  override defaults() {
    return {
      ...super.defaults,
      ...headerAttributes,
      type: 'noctua.NodeCellList',
      size: { width: LIST_ITEM_WIDTH, height: 0 },
      ports: {
        groups: {
          [LIST_GROUP_NAME]: {
            position: itemPosition,
            ...itemAttributes,
          },
        },
        items: [],
      },
    }
  }

  override initialize(...args: any[]) {
    this.on('change:ports', () => this.resizeToFitPorts())
    this.resizeToFitPorts()
    super.initialize.call(this, ...args)
  }

  resizeToFitPorts() {
    const { length } = this.getPorts()
    this.prop(
      ['size', 'height'],
      HEADER_HEIGHT +
        (LIST_ITEM_HEIGHT + LIST_ITEM_GAP) * length +
        PADDING_L
    )
  }

  // ── Service methods (ported from shapes.service.ts) ──

  addHeader(label: string) {
    this.attr('label/text', label)
  }

  addIcon(icon: string) {
    this.attr('icon/xlinkHref', icon)
  }

  addEntity(relationship: string, term: string, hasEvidence: boolean) {
    const attrs: Record<string, any> = {}

    if (relationship) {
      attrs.relationship = { text: relationship }
      attrs.portLabel = { text: term }
      if (!hasEvidence) {
        attrs.portLabel.x = 75
      }
    } else {
      attrs.relationship = { visibility: 'hidden' }
      attrs.portLabel = {
        text: term,
        x: hasEvidence ? 8 : 25,
        width: LIST_ITEM_WIDTH,
        textWrap: { width: LIST_ITEM_WIDTH - 16 },
      }
    }

    this.addPort({ group: LIST_GROUP_NAME, attrs })
  }

  setColor(colorKey: string, _low?: number, high?: number): this {
    const light = getColor(colorKey, high ?? 100)
    if (light) this.attr('body/fill', light)
    return this
  }

  setBorder(colorKey: string, hue?: number): this {
    const deep = getColor(colorKey, hue ?? 500)
    if (deep) this.attr('highlighter/stroke', deep)
    return this
  }

  unsetBorder(): this {
    this.attr('highlighter/stroke', 'transparent')
    return this
  }

  hover(on: boolean): this {
    this.attr('wrapper/strokeWidth', on ? 40 : 0)
    this.attr('editIcon/visibility', on ? 'visible' : 'hidden')
    this.attr('deleteIcon/visibility', on ? 'visible' : 'hidden')
    return this
  }
}

// ── NodeCellMolecule ──────────────────────────────────────────────

const NodeCellMoleculeDefaults = joint.dia.Element.define(
  'noctua.NodeCellMolecule',
  {
    attrs: {
      wrapper: {
        refCx: '50%',
        refCy: '50%',
        refR: '50%',
        magnet: true,
        fill: 'transparent',
        stroke: 'rgba(0,0,255,0.3)',
      },
      circle: {
        refCx: '50%',
        refCy: '50%',
        refR: '50%',
        strokeWidth: 2,
      },
      label: {
        textVerticalAnchor: 'middle',
        textAnchor: 'middle',
        refX: '50%',
        refY: '50%',
        fontSize: 12,
        fill: '#333333',
        textWrap: { ellipsis: false, width: '95%' },
      },
      '.edit': {
        event: 'element:edit:pointerdown',
        'xlink:href': './assets/icons/edit.svg',
        ref: '.wrapper',
        refX: '100%',
        refX2: -10,
        y: 0,
        height: 20,
        width: 20,
        cursor: 'pointer',
        visibility: 'hidden',
      },
      '.delete': {
        event: 'element:delete:pointerdown',
        'xlink:href': './assets/icons/delete.svg',
        ref: '.wrapper',
        refX: '100%',
        refX2: 5,
        y: 30,
        height: 20,
        width: 20,
        cursor: 'pointer',
        visibility: 'hidden',
      },
    },
  },
  {
    markup: [
      '<circle class="wrapper"/>',
      '<g class="rotatable">',
      '<g class="scalable">',
      '<circle class="circle"/>',
      '</g>',
      '<text class="label"/>',
      '<image class="edit"/>',
      '<image class="delete"/>',
      '</g>',
    ].join(''),
  }
)

export class NodeCellMolecule extends NodeCellMoleculeDefaults {
  setColor(colorKey: string, low?: number, high?: number): this {
    const deep = getColor(colorKey, low ?? 200)
    const light = getColor(colorKey, high ?? 100)
    if (deep) this.attr('.circle/stroke', deep)
    if (light) this.attr('.circle/fill', light)
    return this
  }

  setText(text: string): this {
    this.attr('.label/text', text)
    return this
  }

  hover(on: boolean): this {
    this.attr('.wrapper/strokeWidth', on ? 40 : 0)
    this.attr('.edit/visibility', on ? 'visible' : 'hidden')
    this.attr('.delete/visibility', on ? 'visible' : 'hidden')
    return this
  }
}

// ── NodeLink ──────────────────────────────────────────────────────

export class NodeLink extends joint.shapes.standard.Link {
  static create(): NodeLink {
    const link = new NodeLink()
    link.prop({
      z: -1,
      labels: [
        {
          markup: [
            { tagName: 'rect', selector: 'labelBody' },
            { tagName: 'text', selector: 'labelText' },
          ],
          attrs: {
            labelText: {
              fill: '#7c68fc',
              fontSize: 8,
              fontFamily: 'sans-serif',
              textAnchor: 'middle',
              textVerticalAnchor: 'middle',
            },
            labelBody: {
              ref: 'labelText',
              refX: -5,
              refY: -5,
              refWidth: '100%',
              refHeight: '100%',
              refWidth2: 10,
              refHeight2: 10,
              stroke: '#7c68fc',
              fill: 'white',
              strokeWidth: 1,
              rx: 5,
              ry: 5,
            },
          },
          position: {
            distance: 0.5,
            args: { ensureLegibility: true, absoluteOffset: true },
          },
        },
      ],
    })

    link.attr({
      line: {
        stroke: '#005580',
        strokeWidth: 1,
        strokeLinejoin: 'round',
        targetMarker: {
          type: 'path',
          stroke: 'black',
          fill: 'black',
          d: 'M 10 -5 0 0 10 5 Z',
        },
      },
    })

    link.router('normal')
    link.connector('smooth')

    return link
  }

  setText(text: string): this {
    this.label(0, { attrs: { labelText: { text } } })
    return this
  }

  setColor(colorKey: string): this {
    const deep = getColor(colorKey, 800)
    const light = getColor(colorKey, 600)
    const lineColor = light ?? colorKey
    const textColor = deep ?? colorKey

    this.attr('line/stroke', lineColor)
    this.attr('line/targetMarker/stroke', lineColor)
    this.attr('line/targetMarker/fill', lineColor)
    this.label(0, {
      attrs: {
        labelText: { fill: textColor },
        labelBody: { stroke: lineColor },
      },
    })
    return this
  }

  hover(on: boolean): this {
    this.attr('line/strokeWidth', on ? 4 : 1)
    this.label(0, { attrs: { labelBody: { strokeWidth: on ? 2 : 1 } } })
    return this
  }
}

// ── Register shapes in JointJS namespace ──────────────────────────
// Required for cellNamespace / cellViewNamespace to resolve types.

export function registerShapes() {
  Object.assign(joint.shapes, {
    noctua: {
      NodeCellList,
      NodeCellMolecule,
      NodeLink,
    },
  })
}
