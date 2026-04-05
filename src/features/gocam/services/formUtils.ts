import type { TermNode, RelationNode, FlatRow } from '../models/formModels'
import { Aspect } from '../models/cam'

/** Recursively flatten a TermNode tree into renderable rows */
export function flattenNode(
  node: TermNode,
  relation: RelationNode | null,
  parentTermUid: string | null,
  treeLevel: number,
  rows: FlatRow[]
): void {
  rows.push({ termNode: node, relation, parentTermUid, treeLevel })
  for (const rel of node.relations) {
    flattenNode(rel.target, rel, node.uid, treeLevel + 1, rows)
  }
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
