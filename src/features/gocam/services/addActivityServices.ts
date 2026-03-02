import { v4 as uuidv4 } from 'uuid'
import type { TreeNode, EvidenceForm, NodeType } from '../models/cam'

type Operation = {
  entity: string
  operation: string
  arguments: Record<string, unknown>
}

// Selector to find nodes by nodeType
export const findNodeByNodeType = (
  nodes: TreeNode[],
  nodeType: NodeType
): TreeNode | null => {
  for (const node of nodes) {
    if (node.nodeType === nodeType) {
      return node
    }

    const foundInChildren = findNodeByNodeType(node.children, nodeType)
    if (foundInChildren) {
      return foundInChildren
    }
  }

  return null
}

/**
 * Converts a TreeNode structure to Barista API operations
 */
export const convertTreeToJson = (
  tree: TreeNode[],
  modelId: string
): Operation[] => {
  const operations: Operation[] = []
  const nodeVariables = new Map<string, string>()

  processNodes(tree, operations, nodeVariables, modelId)
  processRelationships(tree, operations, nodeVariables, modelId)

  operations.push({
    entity: 'model',
    operation: 'store',
    arguments: {
      'model-id': modelId,
    },
  })

  return operations
}

/**
 * Process all nodes in the tree and add them as individuals
 */
const processNodes = (
  nodes: TreeNode[],
  operations: Operation[],
  nodeVariables: Map<string, string>,
  modelId: string
): void => {
  nodes.forEach(node => {
    if (!node.term?.id) {
      return
    }

    const variableId = uuidv4()
    nodeVariables.set(node.uid, variableId)

    // Build class expression — wrap in complement if NOT qualifier
    const classExpression = node.isComplement
      ? { type: 'complement', operand: [{ type: 'class', id: node.term.id }] }
      : { type: 'class', id: node.term.id }

    operations.push({
      entity: 'individual',
      operation: 'add',
      arguments: {
        expressions: [classExpression],
        'model-id': modelId,
        'assign-to-variable': variableId,
      },
    })

    // Process all evidence entries for this node
    const validEvidences = node.evidences.filter(
      ev => ev.evidenceCode?.id
    )
    validEvidences.forEach((evidence, index) => {
      addEvidenceForNode(
        node.uid,
        index,
        evidence,
        operations,
        nodeVariables,
        modelId
      )
    })

    if (node.children?.length > 0) {
      processNodes(node.children, operations, nodeVariables, modelId)
    }
  })
}

/**
 * Add evidence individual and annotation for a node
 */
const addEvidenceForNode = (
  nodeId: string,
  evidenceIndex: number,
  evidence: EvidenceForm,
  operations: Operation[],
  nodeVariables: Map<string, string>,
  modelId: string
): void => {
  const evidenceVarId = uuidv4()

  operations.push({
    entity: 'individual',
    operation: 'add',
    arguments: {
      expressions: [
        {
          type: 'class',
          id: evidence.evidenceCode.id,
        },
      ],
      'model-id': modelId,
      'assign-to-variable': evidenceVarId,
    },
  })

  const annotationValues: { key: string; value: string }[] = []

  if (evidence.reference) {
    annotationValues.push({
      key: 'source',
      value: evidence.reference,
    })
  }

  if (evidence.withFrom) {
    annotationValues.push({
      key: 'with',
      value: evidence.withFrom,
    })
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

  nodeVariables.set(`${nodeId}_evidence_${evidenceIndex}`, evidenceVarId)
}

/**
 * Process all relationships in the tree
 */
const processRelationships = (
  nodes: TreeNode[],
  operations: Operation[],
  nodeVariables: Map<string, string>,
  modelId: string
): void => {
  nodes.forEach(node => {
    if (node.parentId && node.relation && nodeVariables.has(node.uid)) {
      const parentVarId = nodeVariables.get(node.parentId)
      const nodeVarId = nodeVariables.get(node.uid)

      if (parentVarId && nodeVarId) {
        operations.push({
          entity: 'edge',
          operation: 'add',
          arguments: {
            subject: parentVarId,
            object: nodeVarId,
            predicate: node.relation.id,
            'model-id': modelId,
          },
        })

        // Attach all evidence variables to the edge
        const validEvidences = node.evidences.filter(
          ev => ev.evidenceCode?.id
        )
        validEvidences.forEach((_ev, index) => {
          const evidenceVarId = nodeVariables.get(
            `${node.uid}_evidence_${index}`
          )
          if (evidenceVarId) {
            operations.push({
              entity: 'edge',
              operation: 'add-annotation',
              arguments: {
                subject: parentVarId,
                object: nodeVarId,
                predicate: node.relation!.id,
                values: [
                  {
                    key: 'evidence',
                    value: evidenceVarId,
                  },
                ],
                'model-id': modelId,
              },
            })
          }
        })
      }
    }

    if (node.children?.length > 0) {
      processRelationships(node.children, operations, nodeVariables, modelId)
    }
  })
}
