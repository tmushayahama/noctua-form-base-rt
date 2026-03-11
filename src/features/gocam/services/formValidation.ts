import type {
  ActivityFormState,
  TermNode,
  ValidationError,
} from '../models/formModels'

const VALID_REFERENCE_PREFIXES = ['PMID:', 'DOI:', 'GO_REF:']

export const isValidReference = (ref: string): boolean => {
  if (!ref?.trim()) return false
  return VALID_REFERENCE_PREFIXES.some(prefix =>
    ref.trim().toUpperCase().startsWith(prefix.toUpperCase())
  )
}

/**
 * Validate the activity form by walking the tree.
 */
export const validateActivityForm = (
  state: ActivityFormState
): ValidationError[] => {
  const { root } = state
  if (!root) {
    return [{ uid: '', field: 'root', message: 'No activity form loaded' }]
  }

  const errors: ValidationError[] = []
  let filledCount = 0

  function walkTerm(node: TermNode) {
    if (node.term) filledCount++

    if (node.required && !node.term) {
      errors.push({
        uid: node.uid,
        field: 'term',
        message: `${node.label} is required`,
      })
    }

    for (const rel of node.relations) {
      // If the target has a value, it needs evidence
      if (rel.target.term) {
        if (rel.evidence.length === 0) {
          errors.push({
            uid: rel.uid,
            field: 'evidence',
            message: `${rel.target.label} requires at least one evidence`,
          })
        }

        for (const ev of rel.evidence) {
          if (ev.evidenceCode?.id) {
            if (!ev.reference) {
              errors.push({
                uid: ev.uid,
                field: 'reference',
                message: 'Reference is required when evidence code is set',
              })
            } else if (!isValidReference(ev.reference)) {
              errors.push({
                uid: ev.uid,
                field: 'reference',
                message:
                  'Reference must be in DB:accession format (PMID:xxx, DOI:xxx, GO_REF:xxx)',
              })
            }
          }
        }
      }

      walkTerm(rel.target)
    }
  }

  walkTerm(root)

  if (filledCount < 2) {
    errors.push({
      uid: root.uid,
      field: 'activity',
      message: 'Activity must have at least 2 nodes with values',
    })
  }

  return errors
}
