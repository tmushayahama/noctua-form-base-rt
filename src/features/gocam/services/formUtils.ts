import type { TermNode, RelationNode, FlatRow, GroupedRow } from '../models/formModels'
import { Aspect } from '../models/cam'
import { getInsertWeight, getDisplayGroup, DisplayGroup } from '../data/insertMenuConfig'

/**
 * Sort a parent's relations by the weight configured in canInsertEntity.
 * Mirrors the old graph editor's `sort(compareTripleWeight)` before tree-build.
 */
export function sortRelationsByWeight(
  parentCategory: string,
  relations: RelationNode[]
): RelationNode[] {
  return [...relations].sort(
    (a, b) =>
      getInsertWeight(parentCategory, a.predicate.id, a.target.category) -
      getInsertWeight(parentCategory, b.predicate.id, b.target.category)
  )
}

/** Recursively flatten a TermNode tree into renderable rows, sorted by weight */
export function flattenNode(
  node: TermNode,
  relation: RelationNode | null,
  parentTermUid: string | null,
  treeLevel: number,
  rows: FlatRow[]
): void {
  rows.push({ termNode: node, relation, parentTermUid, treeLevel })
  const sorted = sortRelationsByWeight(node.category, node.relations)
  for (const rel of sorted) {
    flattenNode(rel.target, rel, node.uid, treeLevel + 1, rows)
  }
}

/**
 * Walk the whole TermNode tree producing one GroupedRow per visible node,
 * tagged with its displayGroup, weight, and tree depth (treeLevel: root=1).
 */
export function buildGroupedRows(root: TermNode): GroupedRow[] {
  const rows: GroupedRow[] = []

  function walk(
    node: TermNode,
    parent: TermNode | null,
    relation: RelationNode | null,
    treeLevel: number
  ) {
    if (node.visible !== false) {
      const dg =
        getDisplayGroup(parent?.category ?? null, relation?.predicate.id ?? null, node.category) ??
        DisplayGroup.MF
      const weight =
        parent && relation
          ? getInsertWeight(parent.category, relation.predicate.id, node.category)
          : 0
      rows.push({
        termNode: node,
        relation,
        parentTermUid: parent?.uid ?? null,
        treeLevel,
        displayGroup: dg,
        weight,
      })
    }
    const sortedChildren = sortRelationsByWeight(node.category, node.relations)
    for (const rel of sortedChildren) {
      walk(rel.target, node, rel, treeLevel + 1)
    }
  }

  walk(root, null, null, 1)
  return rows
}

/** Rebase a group's rows so the shallowest is treeLevel 1 (cards reset depth) */
export function rebaseTreeLevels(rows: GroupedRow[]): GroupedRow[] {
  if (rows.length === 0) return rows
  const minLevel = Math.min(...rows.map(r => r.treeLevel))
  return rows.map(r => ({ ...r, treeLevel: r.treeLevel - minLevel + 1 }))
}

/** Find the target TermNode uid for a given relation uid */
export function findTargetUidByRelation(root: TermNode, relationUid: string): string | null {
  for (const rel of root.relations) {
    if (rel.uid === relationUid) return rel.target.uid
    const found = findTargetUidByRelation(rel.target, relationUid)
    if (found) return found
  }
  return null
}

/** Map activity type to left-border Tailwind class */
export function getAspectBorderClass(node: TermNode): string {
  switch (node.aspect) {
    case Aspect.MOLECULAR_FUNCTION:
      return 'border-l-4 border-l-green-400'
    case Aspect.BIOLOGICAL_PROCESS:
      return 'border-l-4 border-l-orange-300'
    case Aspect.CELLULAR_COMPONENT:
      return 'border-l-4 border-l-purple-300'
    default:
      return ''
  }
}
