import { RootTypes } from '../models/cam'
import { Relations } from '@/@noctua.core/models/relations'
import { predicate } from './shapeTerms'

export interface InsertMenuItem {
  label: string
  rangeLabel: string
  targetType: string
  predicate: { id: string; label: string }
  showInMenu: boolean
}

export const canInsertEntity: Record<string, InsertMenuItem[]> = {
  [RootTypes.MOLECULAR_ENTITY]: [
    {
      label: 'part of',
      rangeLabel: 'Protein Complex',
      targetType: RootTypes.PROTEIN_CONTAINING_COMPLEX,
      predicate: predicate(Relations.PART_OF),
      showInMenu: true,
    },
  ],

  [RootTypes.PROTEIN_CONTAINING_COMPLEX]: [
    {
      label: 'has part',
      rangeLabel: 'Gene Product',
      targetType: RootTypes.MOLECULAR_ENTITY,
      predicate: predicate(Relations.HAS_PART),
      showInMenu: true,
    },
  ],

  [RootTypes.MOLECULAR_FUNCTION]: [
    {
      label: 'enabled by',
      rangeLabel: 'Gene Product',
      targetType: RootTypes.MOLECULAR_ENTITY,
      predicate: predicate(Relations.ENABLED_BY),
      showInMenu: false,
    },
    {
      label: 'enabled by',
      rangeLabel: 'Protein Complex',
      targetType: RootTypes.PROTEIN_CONTAINING_COMPLEX,
      predicate: predicate(Relations.ENABLED_BY),
      showInMenu: false,
    },
    {
      label: 'part of',
      rangeLabel: 'Biological Process',
      targetType: RootTypes.BIOLOGICAL_PROCESS,
      predicate: predicate(Relations.PART_OF),
      showInMenu: true,
    },
    {
      label: 'occurs in',
      rangeLabel: 'Cellular Component',
      targetType: RootTypes.CELLULAR_COMPONENT,
      predicate: predicate(Relations.OCCURS_IN),
      showInMenu: true,
    },
    {
      label: 'has input',
      rangeLabel: 'Gene Product/Protein Complex',
      targetType: RootTypes.MOLECULAR_ENTITY,
      predicate: predicate(Relations.HAS_INPUT),
      showInMenu: true,
    },
    {
      label: 'happens during',
      rangeLabel: 'Biological Phase/Stage',
      targetType: RootTypes.BIOLOGICAL_PHASE,
      predicate: predicate(Relations.HAPPENS_DURING),
      showInMenu: true,
    },
  ],

  [RootTypes.BIOLOGICAL_PROCESS]: [
    {
      label: 'part of',
      rangeLabel: 'Biological Process',
      targetType: RootTypes.BIOLOGICAL_PROCESS,
      predicate: predicate(Relations.PART_OF),
      showInMenu: true,
    },
  ],

  [RootTypes.CELLULAR_COMPONENT]: [
    {
      label: 'part of',
      rangeLabel: 'CC/Cell/Anatomy/Organism',
      targetType: RootTypes.ANATOMICAL_ENTITY,
      predicate: predicate(Relations.PART_OF),
      showInMenu: true,
    },
  ],

  [RootTypes.CELL_TYPE]: [
    {
      label: 'part of',
      rangeLabel: 'CC/Cell/Anatomy/Organism',
      targetType: RootTypes.ANATOMICAL_ENTITY,
      predicate: predicate(Relations.PART_OF),
      showInMenu: true,
    },
  ],

  [RootTypes.ANATOMICAL_ENTITY]: [
    {
      label: 'part of',
      rangeLabel: 'CC/Cell/Anatomy/Organism',
      targetType: RootTypes.ANATOMICAL_ENTITY,
      predicate: predicate(Relations.PART_OF),
      showInMenu: true,
    },
  ],

  [RootTypes.CHEMICAL_ENTITY]: [
    {
      label: 'located in',
      rangeLabel: 'Cellular Component',
      targetType: RootTypes.CELLULAR_COMPONENT,
      predicate: predicate(Relations.LOCATED_IN),
      showInMenu: true,
    },
  ],
}

export function getInsertMenuItems(nodeType: string): InsertMenuItem[] {
  return (canInsertEntity[nodeType] ?? []).filter(item => item.showInMenu)
}
