import type { TreeNode } from '../models/cam'
import { ActivityType, NodeType } from '../models/cam'

export interface ValidationError {
  nodeUid: string
  field: string
  message: string
}

/**
 * Validate the activity form tree before submission.
 */
export const validateActivityForm = (
  tree: TreeNode[],
  activityType: ActivityType
): ValidationError[] => {
  const errors: ValidationError[] = []

  if (tree.length === 0) return errors

  const root = tree[0]

  // Root node must have a term (except molecule where it's the only node)
  if (activityType !== ActivityType.MOLECULE && activityType !== ActivityType.CC_ONLY) {
    if (!root.term?.id) {
      errors.push({
        nodeUid: root.uid,
        field: 'term',
        message: 'Molecular function is required',
      })
    }
  }

  // For default, bpOnly, proteinComplex: enabledBy child must have a term
  if (
    activityType === ActivityType.ACTIVITY ||
    activityType === ActivityType.BP_ONLY ||
    activityType === ActivityType.PROTEIN_COMPLEX
  ) {
    const gpNode = root.children.find(
      c =>
        c.nodeType === NodeType.MOLECULAR_ENTITY ||
        c.nodeType === NodeType.PROTEIN_CONTAINING_COMPLEX
    )
    if (gpNode && !gpNode.term?.id) {
      errors.push({
        nodeUid: gpNode.uid,
        field: 'term',
        message: 'Gene product is required',
      })
    }
  }

  // Validate all nodes recursively
  validateNodeEvidence(root, errors)
  for (const child of root.children) {
    validateNodeRecursive(child, errors)
  }

  return errors
}

const validateNodeRecursive = (node: TreeNode, errors: ValidationError[]): void => {
  // If node has a term, check evidence
  if (node.term?.id) {
    validateNodeEvidence(node, errors)
  }

  for (const child of node.children) {
    validateNodeRecursive(child, errors)
  }
}

const validateNodeEvidence = (node: TreeNode, errors: ValidationError[]): void => {
  // If node has a term selected, it should have at least one valid evidence
  if (!node.term?.id) return

  const hasValidEvidence = node.evidences.some(ev => ev.evidenceCode?.id)
  if (!hasValidEvidence) {
    errors.push({
      nodeUid: node.uid,
      field: 'evidence',
      message: 'At least one evidence code is required',
    })
  }

  // Check that evidence with code also has reference
  for (const ev of node.evidences) {
    if (ev.evidenceCode?.id && !ev.reference) {
      errors.push({
        nodeUid: node.uid,
        field: 'reference',
        message: 'Reference is required when evidence code is set',
      })
      break
    }
  }
}
