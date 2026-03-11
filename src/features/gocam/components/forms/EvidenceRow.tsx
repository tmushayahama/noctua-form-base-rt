import type React from 'react'
import { IconButton } from '@mui/material'
import { FaTrash } from 'react-icons/fa'
import { useAppDispatch } from '@/app/hooks'
import TermAutocomplete from '@/features/search/components/Autocomplete'
import { AutocompleteType } from '@/features/search/models/search'
import type { GOlrResponse } from '@/features/search/models/search'
import type { EvidenceForm } from '../../models/formModels'
import type { Entity } from '../../models/cam'
import { RootTypes } from '../../models/cam'
import { updateEvidenceForm, removeEvidenceForm } from '../../slices/activityFormSlice'

interface EvidenceRowProps {
  evidence: EvidenceForm
  relationUid: string
  errors: Map<string, string>
}

const EvidenceRow: React.FC<EvidenceRowProps> = ({
  evidence,
  relationUid,
  errors,
}) => {
  const dispatch = useAppDispatch()

  const handleEvidenceCodeChange = (value: GOlrResponse | null | string) => {
    if (value && typeof value === 'object') {
      dispatch(
        updateEvidenceForm({
          relationUid,
          evidenceUid: evidence.uid,
          field: 'evidenceCode',
          value: { id: value.id, label: value.label } as Entity,
        })
      )
    }
  }

  const handleReferenceChange = (value: GOlrResponse | null | string) => {
    dispatch(
      updateEvidenceForm({
        relationUid,
        evidenceUid: evidence.uid,
        field: 'reference',
        value: typeof value === 'string' ? value : '',
      })
    )
  }

  const handleWithChange = (value: GOlrResponse | null | string) => {
    dispatch(
      updateEvidenceForm({
        relationUid,
        evidenceUid: evidence.uid,
        field: 'withFrom',
        value: typeof value === 'string' ? value : '',
      })
    )
  }

  const handleRemove = () => {
    dispatch(removeEvidenceForm({ relationUid, evidenceUid: evidence.uid }))
  }

  const refError = errors.get(evidence.uid)

  return (
    <div className="flex items-start gap-2 rounded border border-gray-200 bg-gray-50 p-2">
      <div className="min-w-0 flex-1">
        <TermAutocomplete
          label="Evidence Code"
          name={`evidence-${evidence.uid}`}
          autocompleteType={AutocompleteType.EVIDENCE_CODE}
          rootTypeIds={[RootTypes.EVIDENCE]}
          value={
            evidence.evidenceCode?.id
              ? ({
                  id: evidence.evidenceCode.id,
                  label: evidence.evidenceCode.label,
                } as GOlrResponse)
              : null
          }
          onChange={handleEvidenceCodeChange}
          variant="outlined"
        />
      </div>
      <div className="min-w-0 flex-1">
        <TermAutocomplete
          label="Reference"
          name={`reference-${evidence.uid}`}
          autocompleteType={AutocompleteType.REFERENCE}
          value={evidence.reference}
          onChange={handleReferenceChange}
          variant="outlined"
        />
        {refError && (
          <div className="mt-1 text-xs text-red-500">{refError}</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <TermAutocomplete
          label="With/From"
          name={`with-${evidence.uid}`}
          autocompleteType={AutocompleteType.WITH}
          value={evidence.withFrom}
          onChange={handleWithChange}
          variant="outlined"
        />
      </div>
      <IconButton size="small" onClick={handleRemove} className="mt-2">
        <FaTrash size={12} className="text-red-400" />
      </IconButton>
    </div>
  )
}

export default EvidenceRow
