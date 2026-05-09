import { RootTypes } from '../models/cam'
import { Relations } from '@/@noctua.core/models/relations'
import { predicate } from './shapeTerms'

export enum Cardinality {
  ONE_TO_ONE = 'oneToOne',
  ONE_TO_MANY = 'oneToMany',
}

export enum DisplayGroup {
  GP = 'gp',
  MF = 'mf',
  BP = 'bp',
  CC = 'cc',
}

/** Per-section ordering of group cards (lower = renders first) */
export const GROUP_ORDER: Record<DisplayGroup, number> = {
  [DisplayGroup.GP]: 0,
  [DisplayGroup.MF]: 0,
  [DisplayGroup.BP]: 10,
  [DisplayGroup.CC]: 20,
}

/** Default group when a node has no parent edge — derived from its category */
const ROOT_GROUP_BY_CATEGORY: Record<string, DisplayGroup> = {
  [RootTypes.MOLECULAR_FUNCTION]: DisplayGroup.MF,
  [RootTypes.MOLECULAR_ENTITY]: DisplayGroup.GP,
  [RootTypes.PROTEIN_CONTAINING_COMPLEX]: DisplayGroup.GP,
  [RootTypes.BIOLOGICAL_PROCESS]: DisplayGroup.BP,
  [RootTypes.CELLULAR_COMPONENT]: DisplayGroup.CC,
  [RootTypes.ANATOMICAL_ENTITY]: DisplayGroup.CC,
  [RootTypes.CELL_TYPE]: DisplayGroup.CC,
  [RootTypes.CHEMICAL_ENTITY]: DisplayGroup.GP,
}

export interface InsertMenuItem {
  label: string
  rangeLabel: string
  targetType: string
  predicate: { id: string; label: string }
  showInMenu: boolean
  weight: number
  cardinality: Cardinality
  displayGroup: DisplayGroup
}

export const canInsertEntity: Record<string, InsertMenuItem[]> = {
  [RootTypes.MOLECULAR_ENTITY]: [
    {
      label: 'part of',
      rangeLabel: 'Protein Complex',
      targetType: RootTypes.PROTEIN_CONTAINING_COMPLEX,
      predicate: predicate(Relations.PART_OF),
      showInMenu: true,
      weight: 3,
      cardinality: Cardinality.ONE_TO_MANY,
      displayGroup: DisplayGroup.GP,
    },
  ],

  [RootTypes.PROTEIN_CONTAINING_COMPLEX]: [
    {
      label: 'has part',
      rangeLabel: 'Gene Product',
      targetType: RootTypes.MOLECULAR_ENTITY,
      predicate: predicate(Relations.HAS_PART),
      showInMenu: true,
      weight: 3,
      cardinality: Cardinality.ONE_TO_MANY,
      displayGroup: DisplayGroup.GP,
    },
  ],

  [RootTypes.MOLECULAR_FUNCTION]: [
    {
      label: 'enabled by',
      rangeLabel: 'Gene Product',
      targetType: RootTypes.MOLECULAR_ENTITY,
      predicate: predicate(Relations.ENABLED_BY),
      showInMenu: false,
      weight: 2,
      cardinality: Cardinality.ONE_TO_ONE,
      displayGroup: DisplayGroup.GP,
    },
    {
      label: 'enabled by',
      rangeLabel: 'Protein Complex',
      targetType: RootTypes.PROTEIN_CONTAINING_COMPLEX,
      predicate: predicate(Relations.ENABLED_BY),
      showInMenu: false,
      weight: 2,
      cardinality: Cardinality.ONE_TO_ONE,
      displayGroup: DisplayGroup.GP,
    },
    {
      label: 'happens during',
      rangeLabel: 'Biological Phase/Stage',
      targetType: RootTypes.BIOLOGICAL_PHASE,
      predicate: predicate(Relations.HAPPENS_DURING),
      showInMenu: true,
      weight: 3,
      cardinality: Cardinality.ONE_TO_ONE,
      displayGroup: DisplayGroup.MF,
    },
    {
      label: 'has input',
      rangeLabel: 'Gene Product/Protein Complex',
      targetType: RootTypes.MOLECULAR_ENTITY,
      predicate: predicate(Relations.HAS_INPUT),
      showInMenu: true,
      weight: 4,
      cardinality: Cardinality.ONE_TO_MANY,
      displayGroup: DisplayGroup.MF,
    },
    {
      label: 'part of',
      rangeLabel: 'Biological Process',
      targetType: RootTypes.BIOLOGICAL_PROCESS,
      predicate: predicate(Relations.PART_OF),
      showInMenu: true,
      weight: 10,
      cardinality: Cardinality.ONE_TO_ONE,
      displayGroup: DisplayGroup.BP,
    },
    {
      label: 'occurs in',
      rangeLabel: 'Cellular Component',
      targetType: RootTypes.CELLULAR_COMPONENT,
      predicate: predicate(Relations.OCCURS_IN),
      showInMenu: true,
      weight: 20,
      cardinality: Cardinality.ONE_TO_ONE,
      displayGroup: DisplayGroup.CC,
    },
  ],

  [RootTypes.BIOLOGICAL_PROCESS]: [
    {
      label: 'part of',
      rangeLabel: 'Biological Process',
      targetType: RootTypes.BIOLOGICAL_PROCESS,
      predicate: predicate(Relations.PART_OF),
      showInMenu: true,
      weight: 10,
      cardinality: Cardinality.ONE_TO_ONE,
      displayGroup: DisplayGroup.BP,
    },
  ],

  [RootTypes.CELLULAR_COMPONENT]: [
    {
      label: 'part of',
      rangeLabel: 'CC/Cell/Anatomy/Organism',
      targetType: RootTypes.ANATOMICAL_ENTITY,
      predicate: predicate(Relations.PART_OF),
      showInMenu: true,
      weight: 40,
      cardinality: Cardinality.ONE_TO_ONE,
      displayGroup: DisplayGroup.CC,
    },
  ],

  [RootTypes.CELL_TYPE]: [
    {
      label: 'part of',
      rangeLabel: 'CC/Cell/Anatomy/Organism',
      targetType: RootTypes.ANATOMICAL_ENTITY,
      predicate: predicate(Relations.PART_OF),
      showInMenu: true,
      weight: 40,
      cardinality: Cardinality.ONE_TO_ONE,
      displayGroup: DisplayGroup.CC,
    },
  ],

  [RootTypes.ANATOMICAL_ENTITY]: [
    {
      label: 'part of',
      rangeLabel: 'CC/Cell/Anatomy/Organism',
      targetType: RootTypes.ANATOMICAL_ENTITY,
      predicate: predicate(Relations.PART_OF),
      showInMenu: true,
      weight: 40,
      cardinality: Cardinality.ONE_TO_ONE,
      displayGroup: DisplayGroup.CC,
    },
  ],

  [RootTypes.CHEMICAL_ENTITY]: [
    {
      label: 'located in',
      rangeLabel: 'Cellular Component',
      targetType: RootTypes.CELLULAR_COMPONENT,
      predicate: predicate(Relations.LOCATED_IN),
      showInMenu: true,
      weight: 20,
      cardinality: Cardinality.ONE_TO_ONE,
      displayGroup: DisplayGroup.CC,
    },
  ],
}

export interface UsedEdge {
  predicateId: string
  targetType: string
}

/**
 * Look up the configured weight for a (parent, predicate, targetType) triple.
 * Used to sort children of a node in the same order the old graph editor did.
 * Returns Infinity for unknown combos so they sort to the bottom.
 */
export function getInsertWeight(
  parentType: string,
  predicateId: string,
  targetType: string
): number {
  const items = canInsertEntity[parentType] ?? []
  const match = items.find(i => i.predicate.id === predicateId && i.targetType === targetType)
  return match?.weight ?? Number.POSITIVE_INFINITY
}

/**
 * Resolve the displayGroup card a node belongs to.
 * - With a parent edge: looks up the (parent, predicate, target) entry in canInsertEntity.
 * - Without (root nodes): falls back to the category's natural group.
 */
export function getDisplayGroup(
  parentCategory: string | null,
  predicateId: string | null,
  targetCategory: string
): DisplayGroup | null {
  if (parentCategory && predicateId) {
    const items = canInsertEntity[parentCategory] ?? []
    const match = items.find(
      i => i.predicate.id === predicateId && i.targetType === targetCategory
    )
    if (match) return match.displayGroup
  }
  return ROOT_GROUP_BY_CATEGORY[targetCategory] ?? null
}

/**
 * Returns the items insertable from a parent of the given type, after dropping:
 * - items hidden via showInMenu: false
 * - oneToOne items whose (predicate, targetType) is already used on the parent
 */
export function getInsertMenuItems(
  parentType: string,
  used: UsedEdge[] = []
): InsertMenuItem[] {
  const items = canInsertEntity[parentType] ?? []
  return items.filter(item => {
    if (!item.showInMenu) return false
    if (item.cardinality === Cardinality.ONE_TO_ONE) {
      const exists = used.some(
        e => e.predicateId === item.predicate.id && e.targetType === item.targetType
      )
      if (exists) return false
    }
    return true
  })
}
