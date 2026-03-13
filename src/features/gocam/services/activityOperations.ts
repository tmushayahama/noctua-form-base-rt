import { v4 as uuidv4 } from 'uuid'
import type { TermNode, EvidenceForm } from '../models/formModels'
import type { Activity, UserContext } from '../models/cam'

export type Operation = {
  entity: string
  operation: string
  arguments: Record<string, unknown>
}

/**
 * Build Barista API operations to create a new activity from a TermNode tree.
 */
export const buildCreateActivityOperations = (
  root: TermNode,
  modelId: string,
  userContext?: UserContext
): Operation[] => {
  const operations: Operation[] = []
  const termVarIds = new Map<string, string>()

  function walkTerm(node: TermNode) {
    if (!node.term) return

    const varId = uuidv4()
    termVarIds.set(node.uid, varId)

    const expression = node.isComplement
      ? { type: 'complement', filler: { type: 'class', id: node.term.id } }
      : { type: 'class', id: node.term.id }

    operations.push({
      entity: 'individual',
      operation: 'add',
      arguments: {
        expressions: [expression],
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
        modelId,
        userContext
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
  modelId: string,
  userContext?: UserContext
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
 * Edit: diff old activity vs new form tree and emit minimal operations.
 *
 * Strategy:
 * 1. Nodes that exist in both old and new with same UID:
 *    - If term changed → remove-type + add-type (in-place)
 *    - If term unchanged → no-op for the node itself
 * 2. Edges that exist in old but not in new → remove edge
 * 3. Edges that exist in new but not in old → add edge
 * 4. Nodes in old but not in new → remove individual
 * 5. Nodes in new but not in old (no UID match) → add individual
 * 6. Evidence is always replaced (remove old evidence nodes, add new)
 *
 * Falls back to delete-all + recreate-all when the tree structure differs
 * significantly (different root type, etc.)
 */
export const buildEditActivityOperations = (
  root: TermNode,
  existingActivity: Activity,
  modelId: string,
  userContext?: UserContext
): Operation[] => {
  // Collect all form nodes that have existing server UIDs
  const formNodes = new Map<string, TermNode>()
  const formEdges: { sourceUid: string; targetUid: string; predicateId: string; evidence: EvidenceForm[] }[] = []

  function collectFormData(node: TermNode) {
    if (!node.term) return
    formNodes.set(node.uid, node)

    for (const rel of node.relations) {
      if (!rel.target.term) continue
      collectFormData(rel.target)
      formEdges.push({
        sourceUid: node.uid,
        targetUid: rel.target.uid,
        predicateId: rel.predicate.id,
        evidence: rel.evidence,
      })
    }
  }
  collectFormData(root)

  // Check if any form node has a server-assigned UID (edit mode should preserve UIDs)
  const oldNodeUids = new Set(existingActivity.nodes.map(n => n.uid))
  const hasServerUids = [...formNodes.keys()].some(uid => oldNodeUids.has(uid))

  // If no UIDs match (e.g. form was built from template, not loaded from activity),
  // fall back to full delete+recreate
  if (!hasServerUids) {
    return buildFullReplaceOperations(root, existingActivity, modelId, userContext)
  }

  const operations: Operation[] = []
  const newNodeVarIds = new Map<string, string>()

  // 1. Handle nodes: type changes for existing, add for new
  for (const [uid, formNode] of formNodes) {
    const oldNode = existingActivity.nodes.find(n => n.uid === uid)
    if (oldNode) {
      // Existing node — check if type changed
      if (oldNode.id !== formNode.term!.id) {
        operations.push({
          entity: 'individual',
          operation: 'remove-type',
          arguments: {
            individual: uid,
            expressions: [{ type: 'class', id: oldNode.id }],
            'model-id': modelId,
          },
        })

        const expression = formNode.isComplement
          ? { type: 'complement', filler: { type: 'class', id: formNode.term!.id } }
          : { type: 'class', id: formNode.term!.id }

        operations.push({
          entity: 'individual',
          operation: 'add-type',
          arguments: {
            individual: uid,
            expressions: [expression],
            'model-id': modelId,
          },
        })
      }
      newNodeVarIds.set(uid, uid) // use real UID
    } else {
      // New node — needs to be created
      const varId = uuidv4()
      newNodeVarIds.set(uid, varId)

      const expression = formNode.isComplement
        ? { type: 'complement', filler: { type: 'class', id: formNode.term!.id } }
        : { type: 'class', id: formNode.term!.id }

      operations.push({
        entity: 'individual',
        operation: 'add',
        arguments: {
          expressions: [expression],
          'model-id': modelId,
          'assign-to-variable': varId,
        },
      })
    }
  }

  // 2. Remove old edges not in new form
  const newEdgeKeys = new Set(
    formEdges.map(e => `${e.sourceUid}|${e.targetUid}|${e.predicateId}`)
  )
  for (const edge of existingActivity.edges) {
    const key = `${edge.sourceId}|${edge.targetId}|${edge.id}`
    if (!newEdgeKeys.has(key)) {
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
  }

  // 3. Add new edges + evidence
  const oldEdgeKeys = new Set(
    existingActivity.edges.map(e => `${e.sourceId}|${e.targetId}|${e.id}`)
  )
  for (const fe of formEdges) {
    const sourceVar = newNodeVarIds.get(fe.sourceUid)
    const targetVar = newNodeVarIds.get(fe.targetUid)
    if (!sourceVar || !targetVar) continue

    const key = `${fe.sourceUid}|${fe.targetUid}|${fe.predicateId}`
    if (!oldEdgeKeys.has(key)) {
      // New edge
      operations.push({
        entity: 'edge',
        operation: 'add',
        arguments: {
          subject: sourceVar,
          object: targetVar,
          predicate: fe.predicateId,
          'model-id': modelId,
        },
      })
    }

    // Always replace evidence: remove old evidence nodes for this edge, add new
    const oldEdge = existingActivity.edges.find(
      e => e.sourceId === fe.sourceUid && e.targetId === fe.targetUid && e.id === fe.predicateId
    )
    if (oldEdge?.evidence) {
      for (const ev of oldEdge.evidence) {
        operations.push({
          entity: 'individual',
          operation: 'remove',
          arguments: { individual: ev.uid, 'model-id': modelId },
        })
      }
    }

    addEvidenceOperations(
      operations,
      sourceVar,
      targetVar,
      fe.predicateId,
      fe.evidence,
      modelId,
      userContext
    )
  }

  // 4. Remove nodes that are in old but not in new
  for (const oldNode of existingActivity.nodes) {
    if (!formNodes.has(oldNode.uid)) {
      operations.push({
        entity: 'individual',
        operation: 'remove',
        arguments: { individual: oldNode.uid, 'model-id': modelId },
      })
    }
  }

  operations.push({
    entity: 'model',
    operation: 'store',
    arguments: { 'model-id': modelId },
  })

  return operations
}

/**
 * Full delete+recreate fallback for when UIDs don't match.
 */
const buildFullReplaceOperations = (
  root: TermNode,
  existingActivity: Activity,
  modelId: string,
  userContext?: UserContext
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

  const createOps = buildCreateActivityOperations(root, modelId, userContext)
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

/**
 * Add a new child node with an edge to an existing parent node.
 */
export const buildAddNodeOperations = (
  parentUid: string,
  predicateId: string,
  typeId: string,
  modelId: string,
  userContext?: UserContext
): Operation[] => {
  const varId = uuidv4()
  const operations: Operation[] = [
    {
      entity: 'individual',
      operation: 'add',
      arguments: {
        expressions: [{ type: 'class', id: typeId }],
        'model-id': modelId,
        'assign-to-variable': varId,
      },
    },
    {
      entity: 'edge',
      operation: 'add',
      arguments: {
        subject: parentUid,
        object: varId,
        predicate: predicateId,
        'model-id': modelId,
      },
    },
  ]

  if (userContext) {
    operations.push({
      entity: 'individual',
      operation: 'add-annotation',
      arguments: {
        individual: varId,
        values: [
          { key: 'contributor', value: userContext.orcid },
          { key: 'providedBy', value: userContext.groupUrl },
        ],
        'model-id': modelId,
      },
    })
  }

  operations.push({
    entity: 'model',
    operation: 'store',
    arguments: { 'model-id': modelId },
  })

  return operations
}

/**
 * Delete a node and all its edges.
 */
export const buildDeleteNodeOperations = (
  nodeUid: string,
  edges: { sourceId: string; targetId: string; predicateId: string }[],
  modelId: string
): Operation[] => {
  const operations: Operation[] = []

  for (const edge of edges) {
    operations.push({
      entity: 'edge',
      operation: 'remove',
      arguments: {
        subject: edge.sourceId,
        object: edge.targetId,
        predicate: edge.predicateId,
        'model-id': modelId,
      },
    })
  }

  operations.push({
    entity: 'individual',
    operation: 'remove',
    arguments: { individual: nodeUid, 'model-id': modelId },
  })

  operations.push({
    entity: 'model',
    operation: 'store',
    arguments: { 'model-id': modelId },
  })

  return operations
}

// ── Phase 3: Model Metadata Mutations ─────────────────────────────────

/**
 * Build operations to save model annotations (title, state, comments).
 * Strategy: remove all existing, add new, store.
 */
export const buildSaveModelAnnotationsOperations = (
  modelId: string,
  current: { title?: string; state?: string; comments?: string[] },
  updated: { title: string; state: string; comments: string[] }
): Operation[] => {
  const operations: Operation[] = []

  if (current.title) {
    operations.push({
      entity: 'model',
      operation: 'remove-annotation',
      arguments: {
        'model-id': modelId,
        values: [{ key: 'title', value: current.title }],
      },
    })
  }

  if (current.state) {
    operations.push({
      entity: 'model',
      operation: 'remove-annotation',
      arguments: {
        'model-id': modelId,
        values: [{ key: 'state', value: current.state }],
      },
    })
  }

  if (current.comments) {
    for (const comment of current.comments) {
      operations.push({
        entity: 'model',
        operation: 'remove-annotation',
        arguments: {
          'model-id': modelId,
          values: [{ key: 'comment', value: comment }],
        },
      })
    }
  }

  operations.push({
    entity: 'model',
    operation: 'add-annotation',
    arguments: {
      'model-id': modelId,
      values: [{ key: 'title', value: updated.title }],
    },
  })

  operations.push({
    entity: 'model',
    operation: 'add-annotation',
    arguments: {
      'model-id': modelId,
      values: [{ key: 'state', value: updated.state }],
    },
  })

  for (const comment of updated.comments) {
    operations.push({
      entity: 'model',
      operation: 'add-annotation',
      arguments: {
        'model-id': modelId,
        values: [{ key: 'comment', value: comment }],
      },
    })
  }

  operations.push({
    entity: 'model',
    operation: 'store',
    arguments: { 'model-id': modelId },
  })

  return operations
}

// ── Phase 4: Granular Evidence & Node Operations ──────────────────────

/**
 * Add evidence to an existing edge (fact).
 */
export const buildAddEvidenceToEdgeOperations = (
  subjectUid: string,
  objectUid: string,
  predicateId: string,
  evidence: EvidenceForm,
  modelId: string,
  userContext?: UserContext
): Operation[] => {
  const operations: Operation[] = []

  addEvidenceOperations(
    operations,
    subjectUid,
    objectUid,
    predicateId,
    [evidence],
    modelId,
    userContext
  )

  operations.push({
    entity: 'model',
    operation: 'store',
    arguments: { 'model-id': modelId },
  })

  return operations
}

/**
 * Remove a single evidence individual (server cascades annotation removal).
 */
export const buildRemoveEvidenceOperations = (
  evidenceUid: string,
  modelId: string
): Operation[] => [
  {
    entity: 'individual',
    operation: 'remove',
    arguments: { individual: evidenceUid, 'model-id': modelId },
  },
  {
    entity: 'model',
    operation: 'store',
    arguments: { 'model-id': modelId },
  },
]

/**
 * Edit an individual's ontology type in place (remove old type, add new).
 */
export const buildEditIndividualTypeOperations = (
  individualUid: string,
  oldTypeId: string,
  newTypeId: string,
  modelId: string
): Operation[] => [
  {
    entity: 'individual',
    operation: 'remove-type',
    arguments: {
      individual: individualUid,
      expressions: [{ type: 'class', id: oldTypeId }],
      'model-id': modelId,
    },
  },
  {
    entity: 'individual',
    operation: 'add-type',
    arguments: {
      individual: individualUid,
      expressions: [{ type: 'class', id: newTypeId }],
      'model-id': modelId,
    },
  },
  {
    entity: 'model',
    operation: 'store',
    arguments: { 'model-id': modelId },
  },
]

/**
 * Edit an annotation on an evidence individual (source or with).
 */
export const buildEditEvidenceAnnotationOperations = (
  evidenceUid: string,
  key: 'source' | 'with',
  oldValue: string,
  newValue: string,
  modelId: string,
  userContext?: UserContext
): Operation[] => {
  const operations: Operation[] = [
    {
      entity: 'individual',
      operation: 'remove-annotation',
      arguments: {
        individual: evidenceUid,
        values: [{ key, value: oldValue }],
        'model-id': modelId,
      },
    },
    {
      entity: 'individual',
      operation: 'add-annotation',
      arguments: {
        individual: evidenceUid,
        values: [{ key, value: newValue }],
        'model-id': modelId,
      },
    },
  ]

  if (userContext) {
    operations.push({
      entity: 'individual',
      operation: 'remove-annotation',
      arguments: {
        individual: evidenceUid,
        values: [{ key: 'contributor', value: userContext.orcid }],
        'model-id': modelId,
      },
    })
    operations.push({
      entity: 'individual',
      operation: 'add-annotation',
      arguments: {
        individual: evidenceUid,
        values: [
          { key: 'contributor', value: userContext.orcid },
          { key: 'providedBy', value: userContext.groupUrl },
        ],
        'model-id': modelId,
      },
    })
  }

  operations.push({
    entity: 'model',
    operation: 'store',
    arguments: { 'model-id': modelId },
  })

  return operations
}
