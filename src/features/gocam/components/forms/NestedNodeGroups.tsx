import type React from 'react'
import { useMemo } from 'react'
import type { TermNode, RelationNode, FlatRow, ValidationError } from '../../models/formModels'
import { Relations } from '@/@noctua.core/models/relations'
import { flattenNode, getAspectBorderClass } from '../../services/formUtils'
import EntityRow from './EntityRow'

interface NestedNodeGroupsProps {
  root: TermNode
  errors: ValidationError[]
  onSearchAnnotations: (node: TermNode, relation: RelationNode | null) => void
  onCloneEvidence: (relationUid: string) => void
}

const NestedNodeGroups: React.FC<NestedNodeGroupsProps> = ({
  root,
  errors,
  onSearchAnnotations,
  onCloneEvidence,
}) => {
  const rows = useMemo(() => {
    const result: FlatRow[] = []

    for (const rel of root.relations) {
      if (rel.predicate.id === Relations.ENABLED_BY) continue

      if (rel.target.relations.length > 0) {
        for (const childRel of rel.target.relations) {
          flattenNode(childRel.target, childRel, rel.target.uid, 2, result)
        }
      }
    }

    return result
  }, [root])

  if (rows.length === 0) return null

  return (
    <>
      {rows.map(row => (
        <div
          key={row.termNode.uid}
          className={`mb-1 flex flex-row items-stretch justify-start bg-white ${getAspectBorderClass(row.termNode)}`}
        >
          {row.termNode.isComplement && (
            <div className="flex w-[50px] flex-col items-center justify-center bg-gray-300 text-center text-2xs">
              <div>IS NOT</div>
            </div>
          )}
          <div className="w-full">
            <EntityRow
              node={row.termNode}
              relation={row.relation}
              parentTermUid={row.parentTermUid}
              treeLevel={row.treeLevel}
              errors={errors}
              displayMenuButton={true}
              onSearchAnnotations={onSearchAnnotations}
              onCloneEvidence={onCloneEvidence}
            />
          </div>
        </div>
      ))}
    </>
  )
}

export default NestedNodeGroups
