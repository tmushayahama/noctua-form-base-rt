import { v4 as uuidv4 } from 'uuid'
import { Relations } from '@/@noctua.core/models/relations'
import type { Activity, Edge, GraphNode, Aspect } from '../models/cam'
import type { GOlrResponse } from '@/features/search/models/search'
import type {
  ActivityFormType,
  TermNode,
  EvidenceForm,
  NodeCategory,
  TermDescriptor,
  RelationDescriptor,
} from '../models/formModels'
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

// ── Templates ───────────────────────────────────────────────────────

const defaultActivity: TermDescriptor = {
  category: mfCat,
  required: true,
  relations: [
    {
      predicateId: Relations.ENABLED_BY,
      target: { category: gpCat, label: 'enabled by (GP)', required: true, skipEvidenceCheck: true },
    },
    {
      predicateId: Relations.PART_OF,
      target: { category: bpCat, label: '(MF) part of (BP)' },
    },
    {
      predicateId: Relations.OCCURS_IN,
      target: { category: ccCat, label: '(MF) occurs in (CC)' },
    },
  ],
}

const moleculeActivity: TermDescriptor = {
  category: chemCat,
  required: true,
  skipEvidenceCheck: true,
  showEvidence: false,
  relations: [
    {
      predicateId: Relations.LOCATED_IN,
      target: { category: ccCat, label: '(Chemical) located in (CC)' },
    },
  ],
}

const proteinComplexActivity: TermDescriptor = {
  category: mfCat,
  required: true,
  visible: false,
  relations: [
    {
      predicateId: Relations.ENABLED_BY,
      target: {
        category: complexCat,
        required: true,
        skipEvidenceCheck: true,
        relations: [
          { predicateId: Relations.HAS_PART, target: { category: gpCat, canDelete: true } },
        ],
      },
    },
    {
      predicateId: Relations.PART_OF,
      target: { category: bpCat, label: '(MF) part of (BP)' },
    },
    {
      predicateId: Relations.OCCURS_IN,
      target: { category: ccCat, label: '(MF) occurs in (CC)' },
    },
  ],
}

// ── Hydration ───────────────────────────────────────────────────────

function hydrateTemplate(desc: TermDescriptor): TermNode {
  return {
    uid: uuidv4(),
    category: desc.category.id,
    label: desc.label ?? desc.category.label,
    term: null,
    aspect: desc.category.aspect,
    rootTypes: desc.category.searchClosureIds,
    isComplement: false,
    visible: desc.visible ?? true,
    canDelete: desc.canDelete ?? false,
    required: desc.required ?? false,
    skipEvidenceCheck: desc.skipEvidenceCheck ?? false,
    showEvidence: desc.showEvidence ?? true,
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

function graphNodeToGOlrResponse(node: GraphNode): GOlrResponse {
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
    uid: ev.uid,
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
      isComplement: node.isComplement ?? false,
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
