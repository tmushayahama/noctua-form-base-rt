import type { Entity, ShexShape } from '../models/cam'
import shapesData from '@/@noctua.core/data/shapes.json'
import { getRelationLabel } from '@/@noctua.core/utils/dataUtil'

export interface AvailablePredicate {
  id: string
  label: string
  objects: string[]
}

/**
 * Given a node's rootTypes, return the predicates (relations) that can be
 * added as children, along with their valid range rootType IDs.
 * Derived from shapes.json goshapes data.
 */
export function getAvailablePredicates(rootTypes: Entity[]): AvailablePredicate[] {
  const shapes = (shapesData.goshapes || []) as ShexShape[]
  const rootTypeIds = new Set(rootTypes.map(rt => rt.id))

  const predicateMap = new Map<string, Set<string>>()
  for (const shape of shapes) {
    if (!rootTypeIds.has(shape.subject)) continue
    if (!predicateMap.has(shape.predicate)) {
      predicateMap.set(shape.predicate, new Set())
    }
    const objects = predicateMap.get(shape.predicate)!
    for (const obj of shape.object) {
      objects.add(obj)
    }
  }

  return Array.from(predicateMap.entries()).map(([predId, objects]) => ({
    id: predId,
    label: getRelationLabel(predId),
    objects: Array.from(objects),
  }))
}
