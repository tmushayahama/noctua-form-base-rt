import type {
  GraphModel,
  GraphNode,
  Edge,
  CamError,
  ValidationErrors,
  Activity,
  ShExViolation,
  ShExConstraint,
} from '../models/cam'
import { ErrorType, ErrorLevel, RootTypes } from '../models/cam'
import { SHAPE_TERM_LABELS } from '../data/shapeTerms'

function findNode(nodes: GraphNode[], nodeId: string): GraphNode | undefined {
  return nodes.find(n => n.uid === nodeId)
}

function getPropertyLabel(propertyId: string): string {
  return SHAPE_TERM_LABELS[propertyId]?.label ?? propertyId
}

const HTTP_GO_PREFIXES: Array<[string, string]> = [
  ['http://model.geneontology.org/', 'gomodel:'],
  ['http://purl.obolibrary.org/obo/', ''],
]

function toCurie(value: string): string {
  if (!value.startsWith('http')) return value
  for (const [iri, prefix] of HTTP_GO_PREFIXES) {
    if (value.startsWith(iri)) {
      const tail = value.slice(iri.length)
      return prefix + tail.replace('_', ':')
    }
  }
  return value
}

function buildCardinalityError(
  subject: GraphNode,
  constraint: ShExConstraint
): CamError {
  const edgeLabel = getPropertyLabel(constraint.property)
  return {
    category: ErrorLevel.ERROR,
    type: ErrorType.CARDINALITY,
    message: `Only one ${edgeLabel} is allowed`,
    meta: {
      aspect: '',
      subjectNode: { label: subject.label },
      edge: { label: edgeLabel },
    },
  }
}

function buildRelationError(
  subject: GraphNode,
  constraint: ShExConstraint,
  nodes: GraphNode[]
): CamError {
  const edgeLabel = getPropertyLabel(constraint.property)
  const objectId = toCurie(constraint.object ?? '')
  const objectNode = objectId ? findNode(nodes, objectId) : undefined
  const objectLabel = objectNode?.label ?? objectId
  return {
    category: ErrorLevel.ERROR,
    type: ErrorType.RELATION,
    message: `Incorrect relationship between ${subject.label} and ${objectLabel}`,
    meta: {
      aspect: '',
      subjectNode: { label: subject.label },
      edge: { label: edgeLabel },
      objectNode: { label: objectLabel },
    },
  }
}

function processViolation(
  violation: ShExViolation,
  nodes: GraphNode[],
  activityNodeUids: Set<string>
): CamError[] {
  const subject = findNode(nodes, violation.node)
  if (!subject || !activityNodeUids.has(subject.uid)) return []

  const errors: CamError[] = []
  for (const constraint of violation.constraints) {
    if (constraint.cardinality) {
      errors.push(buildCardinalityError(subject, constraint))
    } else if (constraint.object) {
      errors.push(buildRelationError(subject, constraint, nodes))
    }
  }
  return errors
}

function tagActivities(
  activities: Activity[],
  shexViolations: { violation: ShExViolation; errors: CamError[] }[]
): void {
  for (const activity of activities) {
    activity.violations = []
    activity.hasViolations = false
  }
  for (const { violation, errors } of shexViolations) {
    if (errors.length === 0) continue
    for (const activity of activities) {
      if (activity.nodes.some(n => n.uid === violation.node)) {
        activity.hasViolations = true
        activity.violations.push(...errors)
      }
    }
  }
}

function computeOrphans(
  model: GraphModel
): { orphanedNodes: GraphNode[]; orphanedEdges: Edge[] } {
  const activityNodeUids = new Set<string>()
  const activityEdgeUids = new Set<string>()

  for (const activity of model.activities) {
    for (const node of activity.nodes) activityNodeUids.add(node.uid)
    for (const edge of activity.edges) activityEdgeUids.add(edge.uid)
  }
  for (const conn of model.activityConnections) activityEdgeUids.add(conn.uid)

  const orphanedNodes = model.nodes.filter(
    n =>
      !activityNodeUids.has(n.uid) &&
      !n.rootTypes?.includes(RootTypes.EVIDENCE_NODE)
  )
  const orphanedEdges = model.edges.filter(e => !activityEdgeUids.has(e.uid))

  return { orphanedNodes, orphanedEdges }
}

function splitOrphanedNodes(
  orphanedNodes: GraphNode[],
  orphanedEdges: Edge[]
): { standaloneNodes: GraphNode[]; relationNodes: GraphNode[] } {
  const edgeNodeUids = new Set<string>()
  for (const edge of orphanedEdges) {
    edgeNodeUids.add(edge.sourceId)
    edgeNodeUids.add(edge.targetId)
  }
  return {
    standaloneNodes: orphanedNodes.filter(n => !edgeNodeUids.has(n.uid)),
    relationNodes: orphanedNodes.filter(n => edgeNodeUids.has(n.uid)),
  }
}

export function buildValidationErrors(model: GraphModel): ValidationErrors {
  const activityNodeUids = new Set<string>()
  for (const activity of model.activities) {
    for (const node of activity.nodes) activityNodeUids.add(node.uid)
  }

  const perViolation = model.violations.map(violation => ({
    violation,
    errors: processViolation(violation, model.nodes, activityNodeUids),
  }))

  const shexViolations: CamError[] = perViolation.flatMap(p => p.errors)
  tagActivities(model.activities, perViolation)

  const { orphanedNodes, orphanedEdges } = computeOrphans(model)
  const { standaloneNodes, relationNodes } = splitOrphanedNodes(
    orphanedNodes,
    orphanedEdges
  )

  const total = shexViolations.length + orphanedNodes.length + orphanedEdges.length

  return {
    shexViolations,
    orphanedNodes,
    orphanedEdges,
    standaloneNodes,
    relationNodes,
    total,
    hasErrors: total > 0,
  }
}

export function emptyValidationErrors(): ValidationErrors {
  return {
    shexViolations: [],
    orphanedNodes: [],
    orphanedEdges: [],
    standaloneNodes: [],
    relationNodes: [],
    total: 0,
    hasErrors: false,
  }
}
