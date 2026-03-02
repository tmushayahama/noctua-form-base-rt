import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import { v4 as uuidv4 } from 'uuid'
import type {
  Entity,
  EvidenceForm,
  NodeType,
  TreeNode,
  Activity,
  Edge,
  GraphNode,
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
import type { GOlrResponse } from '@/features/search/models/search'
import { Relations } from '@/@noctua.core/models/relations'
import { getRelationLabel, getTermLabel } from '@/@noctua.core/utils/dataUtil'

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

const removeNodeById = (nodes: TreeNode[], uid: string): TreeNode[] => {
  return nodes.filter(node => {
    if (node.uid === uid) return false
    node.children = removeNodeById(node.children, uid)
    return true
  })
}

const findNodeInTree = (nodes: TreeNode[], uid: string): TreeNode | null => {
  for (const node of nodes) {
    if (node.uid === uid) return node
    const found = findNodeInTree(node.children, uid)
    if (found) return found
  }
  return null
}

/**
 * Convert an existing Activity (from graph model) to a TreeNode[] for editing.
 * The root node is the MF node; edges become child nodes with relations.
 */
const activityToTree = (activity: Activity): TreeNode[] => {
  const rootGN = activity.rootNode
  if (!rootGN) return []

  const rootNodeId = uuidv4()
  const processedNodeIds = new Set<string>()

  const graphNodeToTreeNode = (
    gn: GraphNode,
    edge: Edge | null,
    parentTreeId: string | null
  ): TreeNode => {
    const treeId = uuidv4()
    processedNodeIds.add(gn.uid)

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

    const rootTypes: Entity[] = gn.rootTypes.map(rt => ({
      id: rt,
      label: getTermLabel(rt),
    }))

    // Find child edges from this node
    const childEdges = activity.edges.filter(
      e => e.sourceId === gn.uid && !processedNodeIds.has(e.targetId)
    )

    const children = childEdges
      .map(childEdge => {
        const childGN = activity.nodes.find(n => n.uid === childEdge.targetId)
        if (!childGN) return null
        return graphNodeToTreeNode(childGN, childEdge, treeId)
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
        rootTypes: rootTypes,
      },
      rootTypes,
      aspect: getAspect(rootTypes) ?? undefined,
      relation: edge ? { id: edge.id, label: edge.label || getRelationLabel(edge.id) } : undefined,
      evidences,
      children,
    }
  }

  // Build tree starting from root node
  processedNodeIds.add(rootGN.uid)

  const rootEvidences: EvidenceForm[] = [createEmptyEvidence()]
  const rootRootTypes: Entity[] = rootGN.rootTypes.map(rt => ({
    id: rt,
    label: getTermLabel(rt),
  }))

  // Find direct child edges from root
  const rootChildEdges = activity.edges.filter(
    e => e.sourceId === rootGN.uid && !processedNodeIds.has(e.targetId)
  )

  const children = rootChildEdges
    .map(childEdge => {
      const childGN = activity.nodes.find(n => n.uid === childEdge.targetId)
      if (!childGN) return null
      return graphNodeToTreeNode(childGN, childEdge, rootNodeId)
    })
    .filter(Boolean) as TreeNode[]

  const rootTreeNode: TreeNode = {
    uid: rootNodeId,
    parentId: null,
    term: {
      id: rootGN.id,
      label: rootGN.label,
      link: '',
      description: '',
      isObsolete: false,
      rootTypes: rootRootTypes,
    },
    rootTypes: rootRootTypes,
    aspect: getAspect(rootRootTypes) ?? undefined,
    evidences: rootEvidences,
    children,
  }

  return [rootTreeNode]
}

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

      const newRootNode: TreeNode = {
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
      }

      state.tree.push(newRootNode)
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

      const findAndAddChild = (nodes: TreeNode[]): boolean => {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].uid === parentId) {
            nodes[i].children.push({
              uid: uuidv4(),
              relation,
              parentId,
              rootTypes,
              nodeType,
              aspect: getAspect(rootTypes) ?? undefined,
              evidences: [createEmptyEvidence()],
              children: [],
            })
            return true
          }

          if (findAndAddChild(nodes[i].children)) {
            return true
          }
        }
        return false
      }

      findAndAddChild(state.tree)
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
      const node = findNodeInTree(state.tree, uid)
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
      const node = findNodeInTree(state.tree, uid)
      if (!node || !node.evidences[evidenceIndex]) return

      if (field === 'evidenceCode') {
        node.evidences[evidenceIndex].evidenceCode = value as GOlrResponse as Entity
      } else {
        node.evidences[evidenceIndex][field] = value as string
      }
    },

    addEvidence: (state, action: PayloadAction<string>) => {
      const node = findNodeInTree(state.tree, action.payload)
      if (!node) return
      node.evidences.push(createEmptyEvidence())
    },

    removeEvidence: (state, action: PayloadAction<{ uid: string; evidenceIndex: number }>) => {
      const { uid, evidenceIndex } = action.payload
      const node = findNodeInTree(state.tree, uid)
      if (!node) return

      if (node.evidences.length <= 1) {
        // Last evidence row — clear values instead of removing
        node.evidences[0] = createEmptyEvidence()
      } else {
        node.evidences.splice(evidenceIndex, 1)
      }
    },

    cloneEvidence: (state, action: PayloadAction<{ uid: string; evidenceIndex: number }>) => {
      const { uid, evidenceIndex } = action.payload
      const node = findNodeInTree(state.tree, uid)
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
      const node = findNodeInTree(state.tree, uid)
      if (!node) return
      node.evidences = evidences.length > 0 ? evidences : [createEmptyEvidence()]
    },

    clearNodeValues: (state, action: PayloadAction<string>) => {
      const node = findNodeInTree(state.tree, action.payload)
      if (!node) return
      node.term = undefined
      node.evidences = [createEmptyEvidence()]
      node.isComplement = false
    },

    toggleNotQualifier: (state, action: PayloadAction<string>) => {
      const node = findNodeInTree(state.tree, action.payload)
      if (!node) return
      node.isComplement = !node.isComplement
    },

    removeNode: (state, action: PayloadAction<string>) => {
      const uid = action.payload
      state.tree = removeNodeById(state.tree, uid)
    },

    setActivityType: (state, action: PayloadAction<ActivityType>) => {
      const type = action.payload
      state.activityType = type
      state.editingActivityUid = null

      const rootNodeId = uuidv4()
      const mkChild = (relationId: string, rootTypeId: string, nodeType?: NodeType): TreeNode => {
        const rootTypes = [{ id: rootTypeId, label: getTermLabel(rootTypeId) }]
        return {
          uid: uuidv4(),
          parentId: rootNodeId,
          relation: { id: relationId, label: getRelationLabel(relationId) },
          rootTypes,
          nodeType,
          aspect: getAspect(rootTypes) ?? undefined,
          evidences: [createEmptyEvidence()],
          children: [],
        }
      }

      switch (type) {
        case ActivityType.ACTIVITY: {
          const rootTypes = [
            { id: RootTypes.MOLECULAR_FUNCTION, label: getTermLabel(RootTypes.MOLECULAR_FUNCTION) },
          ]
          state.rootTerm = { id: RootTypes.MOLECULAR_FUNCTION, label: getTermLabel(RootTypes.MOLECULAR_FUNCTION) }
          state.tree = [
            {
              uid: rootNodeId,
              parentId: null,
              rootTypes,
              aspect: getAspect(rootTypes) ?? undefined,
              evidences: [createEmptyEvidence()],
              children: [
                mkChild(Relations.ENABLED_BY, RootTypes.MOLECULAR_ENTITY, RootTypes.MOLECULAR_ENTITY as unknown as NodeType),
                mkChild(Relations.PART_OF, RootTypes.BIOLOGICAL_PROCESS),
                mkChild(Relations.OCCURS_IN, RootTypes.CELLULAR_COMPONENT),
              ],
            },
          ]
          break
        }
        case ActivityType.BP_ONLY: {
          const rootTypes = [
            { id: RootTypes.MOLECULAR_FUNCTION, label: getTermLabel(RootTypes.MOLECULAR_FUNCTION) },
          ]
          const bpNodeId = uuidv4()
          const bpRootTypes = [
            { id: RootTypes.BIOLOGICAL_PROCESS, label: getTermLabel(RootTypes.BIOLOGICAL_PROCESS) },
          ]
          const ccRootTypes = [
            { id: RootTypes.CELLULAR_COMPONENT, label: getTermLabel(RootTypes.CELLULAR_COMPONENT) },
          ]
          state.rootTerm = { id: RootTypes.MOLECULAR_FUNCTION, label: getTermLabel(RootTypes.MOLECULAR_FUNCTION) }
          state.tree = [
            {
              uid: rootNodeId,
              parentId: null,
              rootTypes,
              aspect: getAspect(rootTypes) ?? undefined,
              evidences: [createEmptyEvidence()],
              children: [
                mkChild(Relations.ENABLED_BY, RootTypes.MOLECULAR_ENTITY, RootTypes.MOLECULAR_ENTITY as unknown as NodeType),
                {
                  uid: bpNodeId,
                  parentId: rootNodeId,
                  relation: {
                    id: Relations.CAUSALLY_UPSTREAM_OF_OR_WITHIN,
                    label: getRelationLabel(Relations.CAUSALLY_UPSTREAM_OF_OR_WITHIN),
                  },
                  rootTypes: bpRootTypes,
                  aspect: getAspect(bpRootTypes) ?? undefined,
                  evidences: [createEmptyEvidence()],
                  children: [
                    {
                      uid: uuidv4(),
                      parentId: bpNodeId,
                      relation: {
                        id: Relations.OCCURS_IN,
                        label: getRelationLabel(Relations.OCCURS_IN),
                      },
                      rootTypes: ccRootTypes,
                      aspect: getAspect(ccRootTypes) ?? undefined,
                      evidences: [createEmptyEvidence()],
                      children: [],
                    },
                  ],
                },
              ],
            },
          ]
          break
        }
        case ActivityType.CC_ONLY: {
          const rootTypes = [
            { id: RootTypes.MOLECULAR_ENTITY, label: getTermLabel(RootTypes.MOLECULAR_ENTITY) },
          ]
          state.rootTerm = { id: RootTypes.MOLECULAR_ENTITY, label: getTermLabel(RootTypes.MOLECULAR_ENTITY) }
          state.tree = [
            {
              uid: rootNodeId,
              parentId: null,
              rootTypes,
              aspect: getAspect(rootTypes) ?? undefined,
              evidences: [createEmptyEvidence()],
              children: [],
            },
          ]
          break
        }
        case ActivityType.MOLECULE: {
          const rootTypes = [
            { id: RootTypes.CHEMICAL_ENTITY, label: getTermLabel(RootTypes.CHEMICAL_ENTITY) },
          ]
          state.rootTerm = { id: RootTypes.CHEMICAL_ENTITY, label: getTermLabel(RootTypes.CHEMICAL_ENTITY) }
          state.tree = [
            {
              uid: rootNodeId,
              parentId: null,
              rootTypes,
              aspect: getAspect(rootTypes) ?? undefined,
              evidences: [createEmptyEvidence()],
              children: [mkChild(Relations.LOCATED_IN, RootTypes.CELLULAR_COMPONENT)],
            },
          ]
          break
        }
        case ActivityType.PROTEIN_COMPLEX: {
          const rootTypes = [
            { id: RootTypes.MOLECULAR_FUNCTION, label: getTermLabel(RootTypes.MOLECULAR_FUNCTION) },
          ]
          state.rootTerm = { id: RootTypes.MOLECULAR_FUNCTION, label: getTermLabel(RootTypes.MOLECULAR_FUNCTION) }
          state.tree = [
            {
              uid: rootNodeId,
              parentId: null,
              rootTypes,
              aspect: getAspect(rootTypes) ?? undefined,
              evidences: [createEmptyEvidence()],
              children: [
                mkChild(Relations.ENABLED_BY, RootTypes.PROTEIN_CONTAINING_COMPLEX),
                mkChild(Relations.PART_OF, RootTypes.BIOLOGICAL_PROCESS),
                mkChild(Relations.OCCURS_IN, RootTypes.CELLULAR_COMPONENT),
              ],
            },
          ]
          break
        }
      }
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
      const node = findNodeInTree(state.tree, action.payload)
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
      const node = findNodeInTree(state.tree, action.payload)
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
      // Find the BP node (non-GP child of root)
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
