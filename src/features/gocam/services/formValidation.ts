import type {
  ActivityFormState,
  TermNode,
  ValidationError,
} from '../models/formModels'
import { referenceAllowedDBs } from '../data/allowedDatabases'

/**
 * Validate reference format — must be in DB:accession format
 * where DB is one of the allowed reference databases (PMID, DOI, GO_REF).
 */
const isValidReference = (ref: string): boolean => {
  if (!ref?.trim()) return false
  const trimmed = ref.trim()
  const colonIdx = trimmed.indexOf(':')
  if (colonIdx === -1) return false
  const prefix = trimmed.slice(0, colonIdx)
  return referenceAllowedDBs.some(db => db === prefix)
}

/**
 * Validate the activity form by walking the tree.
 *   1. Required nodes must have a term
 *   2. If a node has a term, evidence is checked:
 *      - Evidence code provided → reference is required
 *      - Reference must be in DB:accession format (contain colon)
 *   3. With/from field must be in DB:accession format
 */
export const validateActivityForm = (
  state: ActivityFormState
): ValidationError[] => {
  const { root } = state
  if (!root) {
    return [{ uid: '', field: 'root', message: 'No activity form loaded' }]
  }

  const errors: ValidationError[] = []

  function walkTerm(node: TermNode) {

    // Required node must have a term
    if (node.required && !node.term) {
      errors.push({
        uid: node.uid,
        field: 'term',
        message: `"${node.label}" is required`,
      })
    }

    for (const rel of node.relations) {
      // If the target has a value, validate evidence (skip if target has skipEvidenceCheck)
      if (rel.target.term && !rel.target.skipEvidenceCheck) {
        if (rel.evidence.length === 0) {
          errors.push({
            uid: rel.uid,
            field: 'evidence',
            message: `${rel.target.label} requires at least one evidence`,
          })
        }

        for (let i = 0; i < rel.evidence.length; i++) {
          const ev = rel.evidence[i]
          const evPosition = i + 1

          // Evidence code provided but no reference
          if (ev.evidenceCode?.id && !ev.reference) {
            errors.push({
              uid: ev.uid,
              field: 'reference',
              message: `You provided an evidence for "${rel.target.label}" but no reference: on evidence(${evPosition})`,
            })
          }

          // Reference provided but not in DB:accession format
          if (ev.reference && !isValidReference(ev.reference)) {
            errors.push({
              uid: ev.uid,
              field: 'reference',
              message: `Use DB:accession format for reference "${rel.target.label}" on evidence(${evPosition})`,
            })
          }

          // With field provided but not in DB:accession format
          if (ev.withFrom && !ev.withFrom.includes(':')) {
            errors.push({
              uid: ev.uid,
              field: 'withFrom',
              message: `Use DB:accession format for with/from "${rel.target.label}" on evidence(${evPosition})`,
            })
          }
        }
      }

      walkTerm(rel.target)
    }
  }

  walkTerm(root)

  return errors
}
