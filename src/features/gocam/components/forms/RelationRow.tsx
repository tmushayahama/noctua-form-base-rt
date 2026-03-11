import type React from 'react'
import { Button, IconButton } from '@mui/material'
import { FaPlus, FaTrash } from 'react-icons/fa'
import { useAppDispatch } from '@/app/hooks'
import type { RelationNode, ValidationError } from '../../models/formModels'
import { addEvidenceForm, removeRelationForm } from '../../slices/activityFormSlice'
import TermNode from './TermNode'
import EvidenceRow from './EvidenceRow'

interface RelationRowProps {
  relation: RelationNode
  parentTermUid: string
  errors: ValidationError[]
}

const RelationRow: React.FC<RelationRowProps> = ({
  relation,
  parentTermUid,
  errors,
}) => {
  const dispatch = useAppDispatch()

  const handleAddEvidence = () => {
    dispatch(addEvidenceForm({ relationUid: relation.uid }))
  }

  const handleRemoveRelation = () => {
    dispatch(removeRelationForm({ parentTermUid, relationUid: relation.uid }))
  }

  const evidenceErrors = new Map<string, string>()
  for (const err of errors) {
    if (err.field === 'reference' || err.field === 'evidenceCode') {
      evidenceErrors.set(err.uid, err.message)
    }
  }

  const relationError = errors.find(
    e => e.uid === relation.uid && e.field === 'evidence'
  )

  return (
    <div className="ml-4 border-l-2 border-primary-200 pl-4">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xs font-semibold text-primary-600">
          {relation.predicate.label}
        </span>
        {relation.target.canDelete && (
          <IconButton size="small" onClick={handleRemoveRelation} title="Remove">
            <FaTrash size={10} className="text-red-400" />
          </IconButton>
        )}
      </div>

      <TermNode node={relation.target} errors={errors} />

      {relationError && (
        <div className="ml-2 mt-1 text-xs text-red-500">{relationError.message}</div>
      )}

      <div className="ml-2 mt-2 space-y-2">
        {relation.evidence.map(ev => (
          <EvidenceRow
            key={ev.uid}
            evidence={ev}
            relationUid={relation.uid}
            errors={evidenceErrors}
          />
        ))}

        <Button
          size="small"
          variant="text"
          onClick={handleAddEvidence}
          startIcon={<FaPlus size={10} />}
          className="!text-xs !normal-case"
        >
          Add Evidence
        </Button>
      </div>
    </div>
  )
}

export default RelationRow
