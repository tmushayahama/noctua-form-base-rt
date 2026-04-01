import { v4 as uuidv4 } from 'uuid'
import type { Activity, GraphNode, UserContext } from '@/features/gocam/models/cam'
import { Relations } from '@/@noctua.core/models/relations'
import type { EvidenceForm } from '@/features/gocam/models/formModels'

type Operation = {
  entity: string
  operation: string
  arguments: Record<string, unknown>
}

/**
 * Build Barista API operations to create a causal relation between two activities.
 * Uses the rootNode UIDs (server-assigned MF node IDs) as subject/object.
 */
export const buildConnectorOperations = (
  sourceActivity: Activity,
  targetActivity: Activity,
  relationId: string,
  evidences: EvidenceForm[],
  modelId: string,
  userContext?: UserContext
): Operation[] => {
  const operations: Operation[] = []
  const subjectId = sourceActivity.rootNode.uid
  const objectId = targetActivity.rootNode.uid

  // Add the causal relation edge
  operations.push({
    entity: 'edge',
    operation: 'add',
    arguments: {
      subject: subjectId,
      object: objectId,
      predicate: relationId,
      'model-id': modelId,
    },
  })

  // Add evidence for the edge
  const validEvidences = evidences.filter(ev => ev.evidenceCode?.id)
  for (const evidence of validEvidences) {
    const evidenceVarId = uuidv4()

    // Create evidence individual
    operations.push({
      entity: 'individual',
      operation: 'add',
      arguments: {
        expressions: [{ type: 'class', id: evidence.evidenceCode.id }],
        'model-id': modelId,
        'assign-to-variable': evidenceVarId,
      },
    })

    // Add annotations to evidence (source/reference, with, user attribution)
    const annotationValues: { key: string; value: string }[] = []
    if (evidence.reference) {
      annotationValues.push({ key: 'source', value: evidence.reference })
    }
    if (evidence.withFrom) {
      annotationValues.push({ key: 'with', value: evidence.withFrom })
    }
    if (userContext?.orcid) {
      annotationValues.push({ key: 'contributor', value: userContext.orcid })
    }
    if (userContext?.groupUrl) {
      annotationValues.push({ key: 'providedBy', value: userContext.groupUrl })
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

    // Attach evidence to the edge
    operations.push({
      entity: 'edge',
      operation: 'add-annotation',
      arguments: {
        subject: subjectId,
        object: objectId,
        predicate: relationId,
        values: [{ key: 'evidence', value: evidenceVarId }],
        'model-id': modelId,
      },
    })
  }

  // Store model
  operations.push({
    entity: 'model',
    operation: 'store',
    arguments: { 'model-id': modelId },
  })

  return operations
}

/**
 * Build operations to remove an existing causal relation edge.
 */
/**
 * Build Barista operations to create chemical intermediate connections.
 * For each selected chemical, creates:
 *   subjectMfNode --[has_output]--> chemicalNode
 *   objectMfNode  --[has_input]-->  chemicalNode
 *
 */
export const buildChemicalParticipantOperations = (
  subjectMfNode: GraphNode,
  objectMfNode: GraphNode,
  chemicals: Array<{ id: string; label: string }>,
  modelId: string,
  _userContext?: UserContext
): Operation[] => {
  const operations: Operation[] = []

  for (const chemical of chemicals) {
    const chemVarId = uuidv4()

    // Create individual for the chemical node
    operations.push({
      entity: 'individual',
      operation: 'add',
      arguments: {
        expressions: [{ type: 'class', id: chemical.id }],
        'model-id': modelId,
        'assign-to-variable': chemVarId,
      },
    })

    // subjectMfNode --[has_output]--> chemicalNode
    operations.push({
      entity: 'edge',
      operation: 'add',
      arguments: {
        subject: subjectMfNode.uid,
        object: chemVarId,
        predicate: Relations.HAS_OUTPUT,
        'model-id': modelId,
      },
    })

    // objectMfNode --[has_input]--> chemicalNode
    operations.push({
      entity: 'edge',
      operation: 'add',
      arguments: {
        subject: objectMfNode.uid,
        object: chemVarId,
        predicate: Relations.HAS_INPUT,
        'model-id': modelId,
      },
    })
  }

  // Store model
  if (chemicals.length > 0) {
    operations.push({
      entity: 'model',
      operation: 'store',
      arguments: { 'model-id': modelId },
    })
  }

  return operations
}

/**
 * Build operations to remove an existing causal relation edge.
 */
export const buildConnectorDeleteOperations = (
  sourceNodeUid: string,
  targetNodeUid: string,
  predicateId: string,
  modelId: string
): Operation[] => {
  return [
    {
      entity: 'edge',
      operation: 'remove',
      arguments: {
        subject: sourceNodeUid,
        object: targetNodeUid,
        predicate: predicateId,
        'model-id': modelId,
      },
    },
    {
      entity: 'model',
      operation: 'store',
      arguments: { 'model-id': modelId },
    },
  ]
}
