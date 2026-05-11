import type { Activity, Edge, GraphModel, GraphNode } from '@/features/gocam/models/cam'
import { ActivityType } from '@/features/gocam/models/cam'

export const buildNode = (
  id: string,
  label: string,
  rootTypes: string[] = []
): GraphNode => ({
  uid: `uid_${id || 'empty'}`,
  id,
  label,
  rootTypes,
  isComplement: false,
  contributors: [],
  groups: [],
  sources: [],
})

export const buildEdgeWithEvidence = (
  id: string,
  evidenceCodes: { id: string; label: string }[]
): Edge => ({
  uid: `edge_${id}`,
  id,
  label: 'enabled by',
  sourceId: 'src',
  targetId: 'tgt',
  source: buildNode('src', 'Source'),
  target: buildNode('tgt', 'Target'),
  contributors: [],
  groups: [],
  evidence: evidenceCodes.map((ec, i) => ({
    uid: `ev_${id}_${i}`,
    evidenceCode: ec,
    reference: 'PMID:1',
    referenceUrl: '',
    with: '',
    groups: [],
    contributors: [],
  })),
})

export const buildActivity = (
  uid: string,
  nodes: GraphNode[],
  edges: Edge[] = []
): Activity => ({
  uid,
  type: ActivityType.ACTIVITY,
  rootNode: nodes[0],
  molecularFunction: null,
  enabledBy: null,
  date: null,
  nodes,
  edges,
  hasViolations: false,
  violations: [],
})

export const buildModel = (activities: Activity[]): GraphModel => ({
  id: 'gomodel:test',
  nodes: [],
  edges: [],
  activities,
  activityConnections: [],
  comments: [],
  contributors: [],
  groups: [],
  modified: false,
  violations: [],
  validationErrors: {
    shexViolations: [],
    orphanedNodes: [],
    orphanedEdges: [],
    standaloneNodes: [],
    relationNodes: [],
    total: 0,
    hasErrors: false,
  },
})
