import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@/app/store/store'
import type {
  TermNode,
  RelationNode,
  EvidenceForm,
  ValidationError,
  ActivityFormType,
  ActivityFormState,
} from '../models/formModels'
import { createEvidenceForm, FormMode } from '../models/formModels'
import type { Entity, Activity, Aspect } from '../models/cam'
import { ActivityType } from '../models/cam'
import { createActivityTemplate, activityToFormTree } from '../data/activityTemplates'
import { ROOT_NODES, EVIDENCE_AUTO_POPULATE } from '../data/camConstants'
import { v4 as uuidv4 } from 'uuid'
import type { GOlrResponse } from '@/features/search/models/search'

// ── Tree traversal ──────────────────────────────────────────────────

function findTermNode(root: TermNode, uid: string): TermNode | null {
  if (root.uid === uid) return root
  for (const rel of root.relations) {
    const found = findTermNode(rel.target, uid)
    if (found) return found
  }
  return null
}

function findRelationNode(root: TermNode, uid: string): RelationNode | null {
  for (const rel of root.relations) {
    if (rel.uid === uid) return rel
    const found = findRelationNode(rel.target, uid)
    if (found) return found
  }
  return null
}

function findParentOfRelation(
  root: TermNode,
  relationUid: string
): TermNode | null {
  for (const rel of root.relations) {
    if (rel.uid === relationUid) return root
    const found = findParentOfRelation(rel.target, relationUid)
    if (found) return found
  }
  return null
}

/** Find the relation whose target has the given uid */
function findRelationByTargetUid(
  root: TermNode,
  targetUid: string
): RelationNode | null {
  for (const rel of root.relations) {
    if (rel.target.uid === targetUid) return rel
    const found = findRelationByTargetUid(rel.target, targetUid)
    if (found) return found
  }
  return null
}

// ── Slice ───────────────────────────────────────────────────────────

const initialState: ActivityFormState = {
  activityType: null,
  mode: FormMode.CREATE,
  existingActivityUid: null,
  root: null,
  isDirty: false,
  errors: [],
}

export const activityFormSlice = createSlice({
  name: 'activityForm',
  initialState,
  reducers: {
    initCreateForm(state, action: PayloadAction<ActivityFormType>) {
      state.root = createActivityTemplate(action.payload)
      state.activityType = action.payload
      state.mode = FormMode.CREATE
      state.existingActivityUid = null
      state.isDirty = false
      state.errors = []
    },

    initEditForm(
      state,
      action: PayloadAction<{ activity: Activity; activityType: ActivityFormType }>
    ) {
      const { activity, activityType } = action.payload
      state.root = activityToFormTree(activity)
      state.activityType = activityType
      state.mode = FormMode.EDIT
      state.existingActivityUid = activity.uid
      state.isDirty = false
      state.errors = []
    },

    loadActivity(state, action: PayloadAction<Activity>) {
      const activity = action.payload
      const activityType: ActivityFormType =
        activity.type === ActivityType.MOLECULE
          ? 'molecule'
          : activity.type === ActivityType.PROTEIN_COMPLEX
            ? 'proteinComplex'
            : 'activity'
      state.root = activityToFormTree(activity)
      state.activityType = activityType
      state.mode = FormMode.EDIT
      state.existingActivityUid = activity.uid
      state.isDirty = false
      state.errors = []
    },

    updateTerm(
      state,
      action: PayloadAction<{ uid: string; term: GOlrResponse | null }>
    ) {
      if (!state.root) return
      const node = findTermNode(state.root, action.payload.uid)
      if (node) {
        node.term = action.payload.term
        state.isDirty = true
      }
    },

    updateRelationPredicate(
      state,
      action: PayloadAction<{ uid: string; predicate: Entity }>
    ) {
      if (!state.root) return
      const rel = findRelationNode(state.root, action.payload.uid)
      if (rel) {
        rel.predicate = action.payload.predicate
        state.isDirty = true
      }
    },

    toggleComplement(state, action: PayloadAction<{ uid: string }>) {
      if (!state.root) return
      const node = findTermNode(state.root, action.payload.uid)
      if (node) {
        node.isComplement = !node.isComplement
        state.isDirty = true
      }
    },

    addEvidenceForm(state, action: PayloadAction<{ relationUid: string }>) {
      if (!state.root) return
      const rel = findRelationNode(state.root, action.payload.relationUid)
      if (rel) {
        rel.evidence.push(createEvidenceForm())
        state.isDirty = true
      }
    },

    removeEvidenceForm(
      state,
      action: PayloadAction<{ relationUid: string; evidenceUid: string }>
    ) {
      if (!state.root) return
      const rel = findRelationNode(state.root, action.payload.relationUid)
      if (rel) {
        rel.evidence = rel.evidence.filter(
          ev => ev.uid !== action.payload.evidenceUid
        )
        state.isDirty = true
      }
    },

    updateEvidenceForm(
      state,
      action: PayloadAction<{
        relationUid: string
        evidenceUid: string
        field: keyof EvidenceForm
        value: string | Entity
      }>
    ) {
      if (!state.root) return
      const rel = findRelationNode(state.root, action.payload.relationUid)
      if (!rel) return

      const ev = rel.evidence.find(e => e.uid === action.payload.evidenceUid)
      if (!ev) return

      const { field, value } = action.payload
      if (field === 'evidenceCode' && typeof value === 'object') {
        ev.evidenceCode = value as Entity
      } else if (field === 'reference' && typeof value === 'string') {
        ev.reference = value
      } else if (field === 'withFrom' && typeof value === 'string') {
        ev.withFrom = value
      }
      state.isDirty = true
    },

    setNodeEvidences(
      state,
      action: PayloadAction<{ uid: string; evidences: EvidenceForm[] }>
    ) {
      if (!state.root) return
      const rel = findRelationByTargetUid(state.root, action.payload.uid)
      if (rel) {
        rel.evidence = action.payload.evidences
        state.isDirty = true
      }
    },

    setRelationEvidences(
      state,
      action: PayloadAction<{ relationUid: string; evidences: EvidenceForm[] }>
    ) {
      if (!state.root) return
      const rel = findRelationNode(state.root, action.payload.relationUid)
      if (rel) {
        rel.evidence = action.payload.evidences
        state.isDirty = true
      }
    },

    addRelationForm(
      state,
      action: PayloadAction<{
        parentTermUid: string
        predicate: Entity
        nodeType: string
        label: string
        rootTypes: string[]
        aspect: string | null
      }>
    ) {
      if (!state.root) return
      const parent = findTermNode(state.root, action.payload.parentTermUid)
      if (!parent) return

      const newTarget: TermNode = {
        uid: uuidv4(),
        category: action.payload.nodeType,
        label: action.payload.label,
        term: null,
        aspect: (action.payload.aspect as Aspect | null) ?? null,
        rootTypes: action.payload.rootTypes,
        isComplement: false,
        canDelete: true,
        required: false,
        relations: [],
      }

      parent.relations.push({
        uid: uuidv4(),
        predicate: action.payload.predicate,
        target: newTarget,
        evidence: [createEvidenceForm()],
      })
      state.isDirty = true
    },

    removeRelationForm(
      state,
      action: PayloadAction<{ parentTermUid: string; relationUid: string }>
    ) {
      if (!state.root) return
      const parent = findTermNode(state.root, action.payload.parentTermUid)
      if (!parent) return
      parent.relations = parent.relations.filter(
        r => r.uid !== action.payload.relationUid
      )
      state.isDirty = true
    },

    fillRootTerm(
      state,
      action: PayloadAction<{ termUid: string; relationUid: string }>
    ) {
      if (!state.root) return
      const node = findTermNode(state.root, action.payload.termUid)
      const rel = findRelationNode(state.root, action.payload.relationUid)
      if (!node || !rel) return

      // Fill term with root term for the node's aspect
      const rootEntry = Object.values(ROOT_NODES).find(rn => rn.aspect === node.aspect)
      if (!rootEntry) return

      node.term = {
        id: rootEntry.id,
        label: rootEntry.label,
        link: '',
        description: '',
        isObsolete: false,
        replacedBy: '',
        rootTypes: [],
        xref: '',
        notAnnotatable: true,
        neighborhoodGraphJson: '',
      }

      // Add ND evidence
      rel.evidence = [
        {
          uid: uuidv4(),
          evidenceCode: EVIDENCE_AUTO_POPULATE.nd.evidence,
          reference: EVIDENCE_AUTO_POPULATE.nd.reference,
          withFrom: '',
        },
      ]
      state.isDirty = true
    },

    addISSEvidence(
      state,
      action: PayloadAction<{ relationUid: string }>
    ) {
      if (!state.root) return
      const rel = findRelationNode(state.root, action.payload.relationUid)
      if (!rel) return
      rel.evidence.push({
        uid: uuidv4(),
        evidenceCode: { id: 'ECO:0000250', label: 'ISS' },
        reference: '',
        withFrom: '',
      })
      state.isDirty = true
    },

    clearNodeValues(
      state,
      action: PayloadAction<{ termUid: string; relationUid: string }>
    ) {
      if (!state.root) return
      const node = findTermNode(state.root, action.payload.termUid)
      const rel = findRelationNode(state.root, action.payload.relationUid)
      if (!node) return

      node.term = null
      node.isComplement = false
      if (rel) {
        rel.evidence = [createEvidenceForm()]
      }
      state.isDirty = true
    },

    setErrors(state, action: PayloadAction<ValidationError[]>) {
      state.errors = action.payload
    },

    resetForm() {
      return initialState
    },
  },
})

export const {
  initCreateForm,
  initEditForm,
  loadActivity,
  updateTerm,
  updateRelationPredicate,
  toggleComplement,
  addEvidenceForm,
  removeEvidenceForm,
  updateEvidenceForm,
  setNodeEvidences,
  setRelationEvidences,
  addRelationForm,
  removeRelationForm,
  fillRootTerm,
  addISSEvidence,
  clearNodeValues,
  setErrors,
  resetForm,
} = activityFormSlice.actions

// ── Selectors ───────────────────────────────────────────────────────

export const selectActivityForm = (state: RootState) => state.activityForm
export const selectFormRoot = (state: RootState) => state.activityForm.root
export const selectFormMode = (state: RootState) => state.activityForm.mode
export const selectFormType = (state: RootState) => state.activityForm.activityType
export const selectFormErrors = (state: RootState) => state.activityForm.errors
export const selectExistingActivityUid = (state: RootState) =>
  state.activityForm.existingActivityUid

export default activityFormSlice
