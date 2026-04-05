import { v4 as uuidv4 } from 'uuid'
import type { Activity, GraphNode, UserContext } from '@/features/gocam/models/cam'
import { Relations } from '@/@noctua.core/models/relations'
import type { EvidenceForm } from '@/features/gocam/models/formModels'
import {
  OperationEntity,
  OperationType,
  AnnotationKey,
  ExpressionType,
} from '@/features/gocam/models/operations'
import type { Operation } from '@/features/gocam/models/operations'

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

  operations.push({
    entity: OperationEntity.EDGE,
    operation: OperationType.ADD,
    arguments: {
      subject: subjectId,
      object: objectId,
      predicate: relationId,
      'model-id': modelId,
    },
  })

  const validEvidences = evidences.filter(ev => ev.evidenceCode?.id)
  for (const evidence of validEvidences) {
    const evidenceVarId = uuidv4()

    operations.push({
      entity: OperationEntity.INDIVIDUAL,
      operation: OperationType.ADD,
      arguments: {
        expressions: [{ type: ExpressionType.CLASS, id: evidence.evidenceCode.id }],
        'model-id': modelId,
        'assign-to-variable': evidenceVarId,
      },
    })

    const annotationValues: { key: AnnotationKey; value: string }[] = []
    if (evidence.reference) {
      annotationValues.push({ key: AnnotationKey.SOURCE, value: evidence.reference })
    }
    if (evidence.withFrom) {
      annotationValues.push({ key: AnnotationKey.WITH, value: evidence.withFrom })
    }
    if (userContext?.orcid) {
      annotationValues.push({ key: AnnotationKey.CONTRIBUTOR, value: userContext.orcid })
    }
    if (userContext?.groupUrl) {
      annotationValues.push({ key: AnnotationKey.PROVIDED_BY, value: userContext.groupUrl })
    }

    if (annotationValues.length > 0) {
      operations.push({
        entity: OperationEntity.INDIVIDUAL,
        operation: OperationType.ADD_ANNOTATION,
        arguments: {
          individual: evidenceVarId,
          values: annotationValues,
          'model-id': modelId,
        },
      })
    }

    operations.push({
      entity: OperationEntity.EDGE,
      operation: OperationType.ADD_ANNOTATION,
      arguments: {
        subject: subjectId,
        object: objectId,
        predicate: relationId,
        values: [{ key: AnnotationKey.EVIDENCE, value: evidenceVarId }],
        'model-id': modelId,
      },
    })
  }

  operations.push({
    entity: OperationEntity.MODEL,
    operation: OperationType.STORE,
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

    operations.push({
      entity: OperationEntity.INDIVIDUAL,
      operation: OperationType.ADD,
      arguments: {
        expressions: [{ type: ExpressionType.CLASS, id: chemical.id }],
        'model-id': modelId,
        'assign-to-variable': chemVarId,
      },
    })

    operations.push({
      entity: OperationEntity.EDGE,
      operation: OperationType.ADD,
      arguments: {
        subject: subjectMfNode.uid,
        object: chemVarId,
        predicate: Relations.HAS_OUTPUT,
        'model-id': modelId,
      },
    })

    operations.push({
      entity: OperationEntity.EDGE,
      operation: OperationType.ADD,
      arguments: {
        subject: objectMfNode.uid,
        object: chemVarId,
        predicate: Relations.HAS_INPUT,
        'model-id': modelId,
      },
    })
  }

  if (chemicals.length > 0) {
    operations.push({
      entity: OperationEntity.MODEL,
      operation: OperationType.STORE,
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
      entity: OperationEntity.EDGE,
      operation: OperationType.REMOVE,
      arguments: {
        subject: sourceNodeUid,
        object: targetNodeUid,
        predicate: predicateId,
        'model-id': modelId,
      },
    },
    {
      entity: OperationEntity.MODEL,
      operation: OperationType.STORE,
      arguments: { 'model-id': modelId },
    },
  ]
}
