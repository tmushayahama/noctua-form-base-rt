import type { GraphModel, GraphNode, Edge, CamError } from '../models/cam'
import { ErrorType, ErrorLevel } from '../models/cam'
import { SHAPE_TERM_LABELS } from '../data/shapeTerms'

/**
 * Resolve a node URI/CURIE to a GraphNode in the model.
 * The API returns full IRIs (http://...) or CURIEs — we match against node.uid.
 */
function findNode(model: GraphModel, nodeId: string): GraphNode | undefined {
  return model.nodes.find(n => n.uid === nodeId)
}

/**
 * Get a human-readable label for a relation property CURIE (e.g. "RO:0002333" → "enabled by").
 */
function getPropertyLabel(propertyId: string): string {
  return SHAPE_TERM_LABELS[propertyId]?.label ?? propertyId
}

/**
 * Convert ShExViolation[] on the model into typed CamError[] for display.
 *
 * Matches Angular's generateViolation():
 * - Skip if subject node is not found in any activity (nodeToActivityNode returns null)
 * - Cardinality constraint → CardinalityViolation
 * - Object constraint → RelationViolation
 */
export function processViolations(model: GraphModel): CamError[] {
  const errors: CamError[] = []

  // Build a set of node UIDs that belong to activities
  const activityNodeUids = new Set<string>()
  for (const activity of model.activities) {
    for (const node of activity.nodes) {
      activityNodeUids.add(node.uid)
    }
  }

  for (const violation of model.violations) {
    // Angular: nodeToActivityNode returns null if node isn't in any activity → skip
    const subjectNode = findNode(model, violation.node)
    if (!subjectNode || !activityNodeUids.has(subjectNode.uid)) continue

    const subjectLabel = subjectNode.label

    for (const constraint of violation.constraints) {
      if (constraint.cardinality) {
        const edgeLabel = getPropertyLabel(constraint.property)
        errors.push({
          category: ErrorLevel.ERROR,
          type: ErrorType.CARDINALITY,
          message: `Only one ${edgeLabel} is allowed`,
          meta: {
            subjectNode: { label: subjectLabel },
            edge: { label: edgeLabel },
          },
        })
      } else if (constraint.object) {
        const edgeLabel = getPropertyLabel(constraint.property)
        const objectNode = findNode(model, constraint.object)
        errors.push({
          category: ErrorLevel.ERROR,
          type: ErrorType.RELATION,
          message: `Incorrect relationship between ${subjectLabel} and ${objectNode?.label ?? constraint.object}`,
          meta: {
            subjectNode: { label: subjectLabel },
            edge: { label: edgeLabel },
            objectNode: { label: objectNode?.label ?? constraint.object },
          },
        })
      }
    }
  }

  return errors
}

/**
 * Find nodes and edges in the raw model that don't belong to any activity.
 * These are "orphaned" data — exist in the graph but aren't part of the
 * structured activity tree.
 */
export function computeDiffs(model: GraphModel): {
  diffNodes: GraphNode[]
  diffEdges: Edge[]
} {
  const activityNodeUids = new Set<string>()
  const activityEdgeUids = new Set<string>()

  for (const activity of model.activities) {
    for (const node of activity.nodes) {
      activityNodeUids.add(node.uid)
    }
    for (const edge of activity.edges) {
      activityEdgeUids.add(edge.uid)
    }
  }

  for (const conn of model.activityConnections) {
    activityEdgeUids.add(conn.uid)
  }

  const diffNodes = model.nodes.filter(n => !activityNodeUids.has(n.uid))
  const diffEdges = model.edges.filter(e => !activityEdgeUids.has(e.uid))

  return { diffNodes, diffEdges }
}

export function computeTotalErrors(
  violations: CamError[],
  diffNodes: GraphNode[],
  diffEdges: Edge[]
): number {
  return violations.length + diffNodes.length + diffEdges.length
}
