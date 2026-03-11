import { v4 as uuidv4 } from 'uuid'
import type { TermNode, EvidenceForm } from '../models/formModels'
import type { Activity } from '../models/cam'

type Operation = {
  entity: string
  operation: string
  arguments: Record<string, unknown>
}

/**
 * Build Barista API operations to create a new activity from a TermNode tree.
 */
export const buildCreateActivityOperations = (
  root: TermNode,
  modelId: string
): Operation[] => {
  const operations: Operation[] = []
  const termVarIds = new Map<string, string>()

  function walkTerm(node: TermNode) {
    if (!node.term) return

    const varId = uuidv4()
    termVarIds.set(node.uid, varId)

    const expressions: { type: string; id: string }[] = [
      { type: 'class', id: node.term.id },
    ]

    if (node.isComplement) {
      expressions.push({ type: 'complement', id: node.term.id })
    }

    operations.push({
      entity: 'individual',
      operation: 'add',
      arguments: {
        expressions,
        'model-id': modelId,
        'assign-to-variable': varId,
      },
    })

    for (const rel of node.relations) {
      walkTerm(rel.target)

      const parentVarId = termVarIds.get(node.uid)
      const targetVarId = termVarIds.get(rel.target.uid)
      if (!parentVarId || !targetVarId) continue

      operations.push({
        entity: 'edge',
        operation: 'add',
        arguments: {
          subject: parentVarId,
          object: targetVarId,
          predicate: rel.predicate.id,
          'model-id': modelId,
        },
      })

      addEvidenceOperations(
        operations,
        parentVarId,
        targetVarId,
        rel.predicate.id,
        rel.evidence,
        modelId
      )
    }
  }

  walkTerm(root)

  operations.push({
    entity: 'model',
    operation: 'store',
    arguments: { 'model-id': modelId },
  })

  return operations
}

function addEvidenceOperations(
  operations: Operation[],
  subjectId: string,
  objectId: string,
  predicateId: string,
  evidences: EvidenceForm[],
  modelId: string
) {
  const validEvidences = evidences.filter(ev => ev.evidenceCode?.id)

  for (const evidence of validEvidences) {
    const evidenceVarId = uuidv4()

    operations.push({
      entity: 'individual',
      operation: 'add',
      arguments: {
        expressions: [{ type: 'class', id: evidence.evidenceCode.id }],
        'model-id': modelId,
        'assign-to-variable': evidenceVarId,
      },
    })

    const annotationValues: { key: string; value: string }[] = []
    if (evidence.reference) {
      annotationValues.push({ key: 'source', value: evidence.reference })
    }
    if (evidence.withFrom) {
      annotationValues.push({ key: 'with', value: evidence.withFrom })
    }

    if (annotationValues.length > 0) {
      operations.push({
        entity: 'individual',
        operation: 'add-annotation',
        arguments: {
          individual: evidenceVarId,
          values: annotationValues,
          'model-id': modelId,
        },
      })
    }

    operations.push({
      entity: 'edge',
      operation: 'add-annotation',
      arguments: {
        subject: subjectId,
        object: objectId,
        predicate: predicateId,
        values: [{ key: 'evidence', value: evidenceVarId }],
        'model-id': modelId,
      },
    })
  }
}

/**
 * Edit: delete existing activity, then recreate from tree.
 */
export const buildEditActivityOperations = (
  root: TermNode,
  existingActivity: Activity,
  modelId: string
): Operation[] => {
  const operations: Operation[] = []

  for (const edge of existingActivity.edges) {
    operations.push({
      entity: 'edge',
      operation: 'remove',
      arguments: {
        subject: edge.sourceId,
        object: edge.targetId,
        predicate: edge.id,
        'model-id': modelId,
      },
    })
  }

  for (const node of existingActivity.nodes) {
    operations.push({
      entity: 'individual',
      operation: 'remove',
      arguments: { individual: node.uid, 'model-id': modelId },
    })
  }

  const createOps = buildCreateActivityOperations(root, modelId)
  const withoutStore = createOps.filter(
    op => !(op.entity === 'model' && op.operation === 'store')
  )
  operations.push(...withoutStore)

  operations.push({
    entity: 'model',
    operation: 'store',
    arguments: { 'model-id': modelId },
  })

  return operations
}

/**
 * Delete an entire activity.
 */
export const buildDeleteActivityOperations = (
  activity: Activity,
  modelId: string
): Operation[] => {
  const operations: Operation[] = []

  for (const edge of activity.edges) {
    operations.push({
      entity: 'edge',
      operation: 'remove',
      arguments: {
        subject: edge.sourceId,
        object: edge.targetId,
        predicate: edge.id,
        'model-id': modelId,
      },
    })
  }

  for (const node of activity.nodes) {
    operations.push({
      entity: 'individual',
      operation: 'remove',
      arguments: { individual: node.uid, 'model-id': modelId },
    })
  }

  operations.push({
    entity: 'model',
    operation: 'store',
    arguments: { 'model-id': modelId },
  })

  return operations
}
