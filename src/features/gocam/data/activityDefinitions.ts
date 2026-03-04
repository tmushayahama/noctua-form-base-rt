import { v4 as uuidv4 } from 'uuid'
import type { Entity, TreeNode } from '../models/cam'
import { ActivityType, RootTypes, NodeType, createEmptyEvidence } from '../models/cam'
import { Relations } from '@/@noctua.core/models/relations'
import { getRelationLabel, getTermLabel } from '@/@noctua.core/utils/dataUtil'
import { getAspect } from '../services/graphServices'

/**
 * Declarative description of a child node in an activity tree.
 */
interface NodeDef {
  rootTypeId: string
  relationId: string
  nodeType?: NodeType
  children?: NodeDef[]
}

/**
 * Declarative description of an activity type's tree structure.
 */
interface ActivityDef {
  rootTypeId: string
  children: NodeDef[]
}

/** One definition per activity type — replaces the massive switch in setActivityType. */
const definitions: Record<ActivityType, ActivityDef> = {
  [ActivityType.ACTIVITY]: {
    rootTypeId: RootTypes.MOLECULAR_FUNCTION,
    children: [
      {
        rootTypeId: RootTypes.MOLECULAR_ENTITY,
        relationId: Relations.ENABLED_BY,
        nodeType: NodeType.MOLECULAR_ENTITY,
      },
      { rootTypeId: RootTypes.BIOLOGICAL_PROCESS, relationId: Relations.PART_OF },
      { rootTypeId: RootTypes.CELLULAR_COMPONENT, relationId: Relations.OCCURS_IN },
    ],
  },
  [ActivityType.BP_ONLY]: {
    rootTypeId: RootTypes.MOLECULAR_FUNCTION,
    children: [
      {
        rootTypeId: RootTypes.MOLECULAR_ENTITY,
        relationId: Relations.ENABLED_BY,
        nodeType: NodeType.MOLECULAR_ENTITY,
      },
      {
        rootTypeId: RootTypes.BIOLOGICAL_PROCESS,
        relationId: Relations.CAUSALLY_UPSTREAM_OF_OR_WITHIN,
        children: [
          { rootTypeId: RootTypes.CELLULAR_COMPONENT, relationId: Relations.OCCURS_IN },
        ],
      },
    ],
  },
  [ActivityType.CC_ONLY]: {
    rootTypeId: RootTypes.MOLECULAR_ENTITY,
    children: [],
  },
  [ActivityType.MOLECULE]: {
    rootTypeId: RootTypes.CHEMICAL_ENTITY,
    children: [
      { rootTypeId: RootTypes.CELLULAR_COMPONENT, relationId: Relations.LOCATED_IN },
    ],
  },
  [ActivityType.PROTEIN_COMPLEX]: {
    rootTypeId: RootTypes.MOLECULAR_FUNCTION,
    children: [
      {
        rootTypeId: RootTypes.PROTEIN_CONTAINING_COMPLEX,
        relationId: Relations.ENABLED_BY,
      },
      { rootTypeId: RootTypes.BIOLOGICAL_PROCESS, relationId: Relations.PART_OF },
      { rootTypeId: RootTypes.CELLULAR_COMPONENT, relationId: Relations.OCCURS_IN },
    ],
  },
}

function makeRootTypes(rootTypeId: string): Entity[] {
  return [{ id: rootTypeId, label: getTermLabel(rootTypeId) }]
}

function buildChildren(defs: NodeDef[], parentId: string): TreeNode[] {
  return defs.map(def => {
    const uid = uuidv4()
    const rootTypes = makeRootTypes(def.rootTypeId)
    return {
      uid,
      parentId,
      relation: { id: def.relationId, label: getRelationLabel(def.relationId) },
      rootTypes,
      nodeType: def.nodeType,
      aspect: getAspect(rootTypes) ?? undefined,
      evidences: [createEmptyEvidence()],
      children: def.children ? buildChildren(def.children, uid) : [],
    }
  })
}

/**
 * Build a fresh tree + rootTerm for a given activity type.
 */
export function buildTreeForType(type: ActivityType): { tree: TreeNode[]; rootTerm: Entity } {
  const def = definitions[type]
  const rootId = uuidv4()
  const rootTypes = makeRootTypes(def.rootTypeId)
  const rootTerm = { id: def.rootTypeId, label: getTermLabel(def.rootTypeId) }

  const root: TreeNode = {
    uid: rootId,
    parentId: null,
    rootTypes,
    aspect: getAspect(rootTypes) ?? undefined,
    evidences: [createEmptyEvidence()],
    children: buildChildren(def.children, rootId),
  }

  return { tree: [root], rootTerm }
}
