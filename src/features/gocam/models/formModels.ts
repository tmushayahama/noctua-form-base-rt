import { v4 as uuidv4 } from 'uuid'
import type { Entity, Aspect } from './cam'
import type { GOlrResponse } from '@/features/search/models/search'

export type ActivityFormType = 'activity' | 'molecule' | 'proteinComplex'

// ── Recursive tree ──────────────────────────────────────────────────

export interface TermNode {
  uid: string
  category: string // RootTypes ID (e.g. 'GO:0003674')
  label: string
  term: GOlrResponse | null
  aspect: Aspect | null
  rootTypes: string[]
  isComplement: boolean
  canDelete: boolean
  required: boolean
  visible?: boolean
  skipEvidenceCheck?: boolean
  showEvidence?: boolean
  relations: RelationNode[]
}

export interface RelationNode {
  uid: string
  predicate: Entity
  target: TermNode
  evidence: EvidenceForm[]
}

export interface EvidenceForm {
  uid: string
  evidenceCode: Entity
  reference: string
  withFrom: string
}

export interface ValidationError {
  uid: string
  field: string
  message: string
}

export interface ActivityFormState {
  activityType: ActivityFormType | null
  mode: 'create' | 'edit'
  existingActivityUid: string | null
  root: TermNode | null
  isDirty: boolean
  errors: ValidationError[]
}

// ── Factory ─────────────────────────────────────────────────────────

export const createEvidenceForm = (): EvidenceForm => ({
  uid: uuidv4(),
  evidenceCode: { id: '', label: '' },
  reference: '',
  withFrom: '',
})
