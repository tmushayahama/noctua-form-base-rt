import { v4 as uuidv4 } from 'uuid'
import { Relations } from '@/@noctua.core/models/relations'
import type { Activity, Edge, GraphNode, Aspect } from '../models/cam'
import type { ActivityFormType, TermNode, EvidenceForm } from '../models/formModels'
import { createEvidenceForm } from '../models/formModels'
import { predicate } from './shapeTerms'
import { getNodeCategory } from './nodeCategories'
import {
  molecularFunction as mfCat,
  molecularEntity as gpCat,
  biologicalProcess as bpCat,
  cellularComponent as ccCat,
  chemicalEntity as chemCat,
  proteinContainingComplex as complexCat,
} from './nodeCategories'

// ── Descriptors (pure data, no UIDs) ────────────────────────────────

interface NodeCategory {
  id: string
  label: string
  aspect: Aspect | null
  searchClosureIds: string[]
}

interface TermDescriptor {
  category: NodeCategory
  required?: boolean
  canDelete?: boolean
  relations?: RelationDescriptor[]
}

interface RelationDescriptor {
  predicateId: string
  target: TermDescriptor
}

// ── Templates ───────────────────────────────────────────────────────

const defaultActivity: TermDescriptor = {
  category: mfCat,
  required: true,
  relations: [
    { predicateId: Relations.ENABLED_BY, target: { category: gpCat, required: true } },
    { predicateId: Relations.PART_OF, target: { category: bpCat } },
    { predicateId: Relations.OCCURS_IN, target: { category: ccCat } },
  ],
}

const moleculeActivity: TermDescriptor = {
  category: chemCat,
  required: true,
  relations: [
    { predicateId: Relations.LOCATED_IN, target: { category: ccCat } },
  ],
}

const proteinComplexActivity: TermDescriptor = {
  category: mfCat,
  required: true,
  relations: [
    {
      predicateId: Relations.ENABLED_BY,
      target: {
        category: complexCat,
        required: true,
        relations: [
          { predicateId: Relations.HAS_PART, target: { category: gpCat, canDelete: true } },
        ],
      },
    },
    { predicateId: Relations.PART_OF, target: { category: bpCat } },
    { predicateId: Relations.OCCURS_IN, target: { category: ccCat } },
  ],
}

// ── Hydration ───────────────────────────────────────────────────────

function hydrateTemplate(desc: TermDescriptor): TermNode {
  return {
    uid: uuidv4(),
    category: desc.category.id,
    label: desc.category.label,
    term: null,
    aspect: desc.category.aspect,
    rootTypes: desc.category.searchClosureIds,
    isComplement: false,
    canDelete: desc.canDelete ?? false,
    required: desc.required ?? false,
    relations: (desc.relations ?? []).map(rel => ({
      uid: uuidv4(),
      predicate: predicate(rel.predicateId),
      target: hydrateTemplate(rel.target),
      evidence: [createEvidenceForm()],
    })),
  }
}

export function createActivityTemplate(type: ActivityFormType): TermNode {
  switch (type) {
    case 'molecule':
      return hydrateTemplate(moleculeActivity)
    case 'proteinComplex':
      return hydrateTemplate(proteinComplexActivity)
    case 'activity':
    default:
      return hydrateTemplate(defaultActivity)
  }
}

// ── Edit mode: Activity → TermNode ──────────────────────────────────

function graphNodeToGOlrResponse(node: GraphNode): import('@/features/search/models/search').GOlrResponse {
  return {
    id: node.id,
    label: node.label,
    link: '',
    description: '',
    isObsolete: false,
    replacedBy: '',
    rootTypes: node.rootTypes.map(rt => ({ id: rt, label: '' })),
    xref: '',
    notAnnotatable: true,
    neighborhoodGraphJson: '',
  }
}

function edgeToEvidenceForms(edge: Edge): EvidenceForm[] {
  if (!edge.evidence?.length) return [createEvidenceForm()]
  return edge.evidence.map(ev => ({
    uid: uuidv4(),
    evidenceCode: { id: ev.evidenceCode.id, label: ev.evidenceCode.label },
    reference: ev.reference || '',
    withFrom: ev.with || '',
  }))
}

function inferCategory(node: GraphNode): string {
  for (const id of node.rootTypes || []) {
    if (getNodeCategory(id)) return id
  }
  return node.rootTypes?.[0] ?? ''
}

function inferLabel(category: string, fallback: string): string {
  return getNodeCategory(category)?.label ?? fallback
}

function inferAspect(category: string): Aspect | null {
  return getNodeCategory(category)?.aspect ?? null
}

/**
 * Convert an existing Activity into a TermNode tree for edit mode.
 */
export function activityToFormTree(activity: Activity): TermNode {
  const visited = new Set<string>()

  function buildNode(node: GraphNode, isRoot: boolean): TermNode {
    visited.add(node.uid)
    const category = inferCategory(node)

    const outEdges = activity.edges.filter(
      e => e.sourceId === node.uid && !visited.has(e.targetId)
    )

    return {
      uid: node.uid,
      category,
      label: inferLabel(category, node.label),
      term: graphNodeToGOlrResponse(node),
      aspect: inferAspect(category),
      rootTypes: node.rootTypes,
      isComplement: false,
      canDelete: !isRoot,
      required: isRoot,
      relations: outEdges.map(edge => {
        const targetNode =
          activity.nodes.find(n => n.uid === edge.targetId) ?? edge.target
        return {
          uid: uuidv4(),
          predicate: { id: edge.id, label: edge.label },
          target: buildNode(targetNode, false),
          evidence: edgeToEvidenceForms(edge),
        }
      }),
    }
  }

  return buildNode(activity.rootNode, true)
}
