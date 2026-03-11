import type React from 'react'
import { IconButton, Checkbox, FormControlLabel } from '@mui/material'
import { FaTrash } from 'react-icons/fa'
import { useAppDispatch } from '@/app/hooks'
import TermAutocomplete from '@/features/search/components/Autocomplete'
import { AutocompleteType } from '@/features/search/models/search'
import type { GOlrResponse } from '@/features/search/models/search'
import type { TermNode as TermNodeType, ValidationError } from '../../models/formModels'
import { updateTerm, toggleComplement } from '../../slices/activityFormSlice'
import RelationRow from './RelationRow'
import AddNodeMenu from './AddNodeMenu'

interface TermNodeProps {
  node: TermNodeType
  errors: ValidationError[]
  onDelete?: () => void
}

const TermNode: React.FC<TermNodeProps> = ({ node, errors, onDelete }) => {
  const dispatch = useAppDispatch()

  const handleTermChange = (value: GOlrResponse | null | string) => {
    if (typeof value === 'object') {
      dispatch(updateTerm({ uid: node.uid, term: value }))
    }
  }

  const handleToggleComplement = () => {
    dispatch(toggleComplement({ uid: node.uid }))
  }

  const termError = errors.find(
    e => e.uid === node.uid && e.field === 'term'
  )

  return (
    <div className="mb-2">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <TermAutocomplete
            label={node.label}
            name={`term-${node.uid}`}
            autocompleteType={AutocompleteType.TERM}
            rootTypeIds={node.rootTypes}
            value={node.term}
            onChange={handleTermChange}
            variant="outlined"
          />
          {termError && (
            <div className="mt-1 text-xs text-red-500">{termError.message}</div>
          )}
        </div>

        <div className="flex items-center gap-1 pt-2">
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={node.isComplement}
                onChange={handleToggleComplement}
              />
            }
            label={<span className="text-xs">NOT</span>}
            className="!mr-0"
          />
          <AddNodeMenu parentNode={node} />
          {node.canDelete && onDelete && (
            <IconButton size="small" onClick={onDelete}>
              <FaTrash size={12} className="text-red-400" />
            </IconButton>
          )}
        </div>
      </div>

      {node.relations.length > 0 && (
        <div className="mt-2 space-y-3">
          {node.relations.map(rel => (
            <RelationRow
              key={rel.uid}
              relation={rel}
              parentTermUid={node.uid}
              errors={errors}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default TermNode
