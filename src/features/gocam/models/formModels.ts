import { v4 as uuidv4 } from 'uuid'
import type { Aspect, Entity } from './cam'
import type { GOlrResponse } from '@/features/search/models/search'
import type { DisplayGroup } from '../data/insertMenuConfig'

export type ActivityFormType = 'activity' | 'molecule' | 'proteinComplex'

export enum FormMode {
  CREATE = 'create',
  EDIT = 'edit',
}

// ── Template descriptors (used by activityTemplates.ts) ─────────────

export interface NodeCategory {
  id: string
  label: string
  aspect: Aspect | null
  searchClosureIds: string[]
}

export interface TermDescriptor {
  category: NodeCategory
  label?: string
  required?: boolean
  canDelete?: boolean
  visible?: boolean
  skipEvidenceCheck?: boolean
  showEvidence?: boolean
  relations?: RelationDescriptor[]
}

export interface RelationDescriptor {
  predicateId: string
  target: TermDescriptor
}

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
  mode: FormMode
  existingActivityUid: string | null
  root: TermNode | null
  isDirty: boolean
  errors: ValidationError[]
}

// ── Flattened tree row (used by ActivityForm) ───────────────────────

export interface FlatRow {
  termNode: TermNode
  relation: RelationNode | null
  parentTermUid: string | null
  treeLevel: number
}

/** Row tagged with its displayGroup card + sort weight + tree depth */
export interface GroupedRow {
  termNode: TermNode
  relation: RelationNode | null
  parentTermUid: string | null
  treeLevel: number
  displayGroup: DisplayGroup
  weight: number
}

// ── With/From field types (used by WithDropdown) ────────────────────

export interface WithEntity {
  db: string
  accession: string
}

export interface WithGroup {
  entities: WithEntity[]
}

// ── Factory ─────────────────────────────────────────────────────────

export const createEvidenceForm = (): EvidenceForm => ({
  uid: uuidv4(),
  evidenceCode: { id: '', label: '' },
  reference: '',
  withFrom: '',
})
