import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import { v4 as uuidv4 } from 'uuid'
import type {
  Entity,
  EvidenceForm,
  NodeType,
  TreeNode,
  Activity,
  GraphNode,
  Edge,
} from '../models/cam'
import {
  createEmptyEvidence,
  RootTypes,
  ActivityType,
  ROOT_TERMS,
  EVIDENCE_ND,
  EVIDENCE_ISS,
} from '../models/cam'
import { getAspect } from '../services/graphServices'
import { findNode, removeNode as removeTreeNode } from '../services/treeUtils'
import { toEntity } from '../services/evidenceUtils'
import { buildTreeForType } from '../data/activityDefinitions'
import type { GOlrResponse } from '@/features/search/models/search'
import { Relations } from '@/@noctua.core/models/relations'
import { getRelationLabel, getTermLabel } from '@/@noctua.core/utils/dataUtil'

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface TreeState {
  rootTerm: Entity | null
  tree: TreeNode[]
  initialRelations: string[]
  editingActivityUid: string | null
  activityType: ActivityType
}

const initialState: TreeState = {
  rootTerm: null,
  tree: [],
  initialRelations: Object.values(Relations),
  editingActivityUid: null,
  activityType: ActivityType.ACTIVITY,
}

// ---------------------------------------------------------------------------
// Helpers (private to this file)
// ---------------------------------------------------------------------------

/** Convert an existing Activity (from graph model) into a TreeNode[] for editing. */
const activityToTree = (activity: Activity): TreeNode[] => {
  const rootGN = activity.rootNode
  if (!rootGN) return []

  const visited = new Set<string>()

  const convert = (gn: GraphNode, edge: Edge | null, parentTreeId: string | null): TreeNode => {
    const treeId = uuidv4()
    visited.add(gn.uid)

    const rootTypes: Entity[] = gn.rootTypes.map(rt => ({ id: rt, label: getTermLabel(rt) }))

    const evidences: EvidenceForm[] =
      edge?.evidence && edge.evidence.length > 0
        ? edge.evidence.map(ev => ({
            uuid: uuidv4(),
            evidenceCode: ev.evidenceCode
              ? { id: ev.evidenceCode.id, label: ev.evidenceCode.label }
              : { id: '', label: '' },
            reference: ev.reference || '',
            withFrom: ev.with || '',
          }))
        : [createEmptyEvidence()]

    const childEdges = activity.edges.filter(
      e => e.sourceId === gn.uid && !visited.has(e.targetId)
    )

    const children = childEdges
      .map(ce => {
        const childGN = activity.nodes.find(n => n.uid === ce.targetId)
        return childGN ? convert(childGN, ce, treeId) : null
      })
      .filter(Boolean) as TreeNode[]

    return {
      uid: treeId,
      parentId: parentTreeId,
      term: {
        id: gn.id,
        label: gn.label,
        link: '',
        description: '',
        isObsolete: false,
        rootTypes,
      },
      rootTypes,
      aspect: getAspect(rootTypes) ?? undefined,
      relation: edge
        ? { id: edge.id, label: edge.label || getRelationLabel(edge.id) }
        : undefined,
      evidences,
      children,
    }
  }

  return [convert(rootGN, null, null)]
}

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

export const activityFormSlice = createSlice({
  name: 'activityForm',
  initialState,
  reducers: {
    setRootTerm: (state, action: PayloadAction<Entity>) => {
      state.rootTerm = action.payload
      state.tree = []
    },

    addRootNode: (
      state,
      action: PayloadAction<{
        rootTypes: Entity[]
        initialChildren?: {
          relation: Entity
          rootTypes: Entity[]
          nodeType?: NodeType
        }[]
      }>
    ) => {
      const { rootTypes, initialChildren } = action.payload
      const rootNodeId = uuidv4()

      state.tree.push({
        uid: rootNodeId,
        parentId: null,
        rootTypes,
        evidences: [createEmptyEvidence()],
        children: initialChildren
          ? initialChildren.map(child => ({
              uid: uuidv4(),
              relation: child.relation,
              parentId: rootNodeId,
              rootTypes: child.rootTypes,
              nodeType: child.nodeType,
              evidences: [createEmptyEvidence()],
              children: [],
            }))
          : [],
      })
    },

    addChildNode: (
      state,
      action: PayloadAction<{
        parentId: string
        relation: Entity
        rootTypes: Entity[]
        nodeType?: NodeType
      }>
    ) => {
      const { parentId, relation, rootTypes, nodeType } = action.payload
      const parent = findNode(state.tree, parentId)
      if (!parent) return

      parent.children.push({
        uid: uuidv4(),
        relation,
        parentId,
        rootTypes,
        nodeType,
        aspect: getAspect(rootTypes) ?? undefined,
        evidences: [createEmptyEvidence()],
        children: [],
      })
    },

    updateNode: (
      state,
      action: PayloadAction<{
        uid: string
        term?: GOlrResponse
        relation?: Entity
        rootTypes?: Entity[]
      }>
    ) => {
      const { uid, relation, rootTypes, term } = action.payload
      const node = findNode(state.tree, uid)
      if (!node) return

      if (term !== undefined) node.term = term
      if (relation !== undefined) node.relation = relation
      if (rootTypes !== undefined) node.rootTypes = rootTypes
    },

    updateEvidence: (
      state,
      action: PayloadAction<{
        uid: string
        evidenceIndex: number
        field: 'evidenceCode' | 'reference' | 'withFrom'
        value: GOlrResponse | string
      }>
    ) => {
      const { uid, evidenceIndex, field, value } = action.payload
      const node = findNode(state.tree, uid)
      if (!node || !node.evidences[evidenceIndex]) return

      if (field === 'evidenceCode') {
        node.evidences[evidenceIndex].evidenceCode = toEntity(value as GOlrResponse)
      } else {
        node.evidences[evidenceIndex][field] = value as string
      }
    },

    addEvidence: (state, action: PayloadAction<string>) => {
      const node = findNode(state.tree, action.payload)
      if (!node) return
      node.evidences.push(createEmptyEvidence())
    },

    removeEvidence: (state, action: PayloadAction<{ uid: string; evidenceIndex: number }>) => {
      const { uid, evidenceIndex } = action.payload
      const node = findNode(state.tree, uid)
      if (!node) return

      if (node.evidences.length <= 1) {
        node.evidences[0] = createEmptyEvidence()
      } else {
        node.evidences.splice(evidenceIndex, 1)
      }
    },

    cloneEvidence: (state, action: PayloadAction<{ uid: string; evidenceIndex: number }>) => {
      const { uid, evidenceIndex } = action.payload
      const node = findNode(state.tree, uid)
      if (!node || !node.evidences[evidenceIndex]) return

      const source = node.evidences[evidenceIndex]
      node.evidences.push({
        uuid: uuidv4(),
        evidenceCode: { ...source.evidenceCode },
        reference: source.reference,
        withFrom: source.withFrom,
      })
    },

    setNodeEvidences: (
      state,
      action: PayloadAction<{ uid: string; evidences: EvidenceForm[] }>
    ) => {
      const { uid, evidences } = action.payload
      const node = findNode(state.tree, uid)
      if (!node) return
      node.evidences = evidences.length > 0 ? evidences : [createEmptyEvidence()]
    },

    clearNodeValues: (state, action: PayloadAction<string>) => {
      const node = findNode(state.tree, action.payload)
      if (!node) return
      node.term = undefined
      node.evidences = [createEmptyEvidence()]
      node.isComplement = false
    },

    toggleNotQualifier: (state, action: PayloadAction<string>) => {
      const node = findNode(state.tree, action.payload)
      if (!node) return
      node.isComplement = !node.isComplement
    },

    removeNode: (state, action: PayloadAction<string>) => {
      state.tree = removeTreeNode(state.tree, action.payload)
    },

    setActivityType: (state, action: PayloadAction<ActivityType>) => {
      const type = action.payload
      const { tree, rootTerm } = buildTreeForType(type)
      state.activityType = type
      state.editingActivityUid = null
      state.tree = tree
      state.rootTerm = rootTerm
    },

    loadActivity: (state, action: PayloadAction<Activity>) => {
      const activity = action.payload
      state.editingActivityUid = activity.uid
      state.tree = activityToTree(activity)
      if (activity.molecularFunction) {
        state.rootTerm = {
          id: activity.molecularFunction.id,
          label: activity.molecularFunction.label,
        }
      }
    },

    fillRootTerm: (state, action: PayloadAction<string>) => {
      const node = findNode(state.tree, action.payload)
      if (!node?.aspect) return
      const rootTerm = ROOT_TERMS[node.aspect]
      if (!rootTerm) return
      node.term = {
        id: rootTerm.id,
        label: rootTerm.label,
        link: '',
        description: '',
        isObsolete: false,
        rootTypes: [],
      } as GOlrResponse
      node.evidences = [
        {
          uuid: uuidv4(),
          evidenceCode: EVIDENCE_ND.evidence,
          reference: EVIDENCE_ND.reference,
          withFrom: '',
        },
      ]
    },

    addISSEvidence: (state, action: PayloadAction<string>) => {
      const node = findNode(state.tree, action.payload)
      if (!node?.aspect) return
      node.evidences = [
        {
          uuid: uuidv4(),
          evidenceCode: EVIDENCE_ISS.evidence,
          reference: EVIDENCE_ISS.reference,
          withFrom: '',
        },
      ]
    },

    setBpOnlyEdge: (state, action: PayloadAction<Entity>) => {
      const root = state.tree[0]
      if (!root) return
      const bpNode = root.children.find(
        c =>
          c.rootTypes.some(rt => rt.id === RootTypes.BIOLOGICAL_PROCESS) &&
          c.relation?.id !== Relations.ENABLED_BY
      )
      if (bpNode) {
        bpNode.relation = action.payload
      }
    },

    resetForm: () => initialState,
  },
})

export const {
  setRootTerm,
  addRootNode,
  addChildNode,
  updateNode,
  updateEvidence,
  addEvidence,
  removeEvidence,
  cloneEvidence,
  setNodeEvidences,
  clearNodeValues,
  toggleNotQualifier,
  removeNode,
  setActivityType,
  loadActivity,
  fillRootTerm,
  addISSEvidence,
  setBpOnlyEdge,
  resetForm,
} = activityFormSlice.actions
export default activityFormSlice.reducer
