import { useAppDispatch } from '@/app/hooks'
import type { AnnotationsResponse } from '@/features/search/models/search'
import { Button, Checkbox } from '@mantine/core'
import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { FaCheckCircle } from 'react-icons/fa'
import type { Aspect, Evidence } from '../../models/cam'
import type { EvidenceForm } from '../../models/formModels'
import { useSearchAnnotationsQuery } from '@/features/search/slices/lookupApiSlice'
import { updateTerm, setNodeEvidences, setRelationEvidences } from '../../slices/activityFormSlice'
import { closeDialog } from '@/@noctua.core/components/dialog/dialogSlice'

interface SearchAnnotationsProps {
  gpId: string
  aspect?: Aspect
  term?: string
  targetNodeUid?: string
  relationUid?: string
}

const SearchAnnotations: React.FC<SearchAnnotationsProps> = ({
  gpId,
  aspect,
  term,
  targetNodeUid,
  relationUid,
}) => {
  const dispatch = useAppDispatch()
  const [selectedTerm, setSelectedTerm] = useState<AnnotationsResponse | null>(null)
  const [selectedEvidences, setSelectedEvidences] = useState<Evidence[]>([])
  const { data: annotations = [] } = useSearchAnnotationsQuery({
    gpId,
    aspect,
    term,
  })

  const handleSelectTerm = (annotation: AnnotationsResponse) => {
    setSelectedTerm(annotation)
    setSelectedEvidences([])
  }

  const handleEvidenceToggle = (evidence: Evidence) => {
    const isSelected = selectedEvidences.some(e => e.uid === evidence.uid)
    if (isSelected) {
      setSelectedEvidences(selectedEvidences.filter(e => e.uid !== evidence.uid))
    } else {
      setSelectedEvidences([...selectedEvidences, evidence])
    }
  }

  const evidences = selectedTerm?.evidences ?? []
  const allSelected = evidences.length > 0 && selectedEvidences.length === evidences.length
  const someSelected = selectedEvidences.length > 0 && selectedEvidences.length < evidences.length

  const handleMasterToggle = () => {
    if (allSelected) {
      setSelectedEvidences([])
    } else {
      setSelectedEvidences([...evidences])
    }
  }

  const handleSave = () => {
    if (!selectedTerm || !targetNodeUid) return

    dispatch(
      updateTerm({
        uid: targetNodeUid,
        term: {
          id: selectedTerm.term.id,
          label: selectedTerm.term.label,
          link: '',
          description: '',
          isObsolete: false,
          rootTypes: [],
        },
      })
    )

    if (selectedEvidences.length > 0) {
      const evidenceForms: EvidenceForm[] = selectedEvidences.map(ev => ({
        uid: uuidv4(),
        evidenceCode: { id: ev.evidenceCode.id, label: ev.evidenceCode.label },
        reference: ev.reference || '',
        withFrom: ev.with || '',
      }))

      if (relationUid) {
        dispatch(setRelationEvidences({ relationUid, evidences: evidenceForms }))
      } else {
        dispatch(setNodeEvidences({ uid: targetNodeUid, evidences: evidenceForms }))
      }
    }

    dispatch(closeDialog())
  }

  return (
    <div className="flex h-full min-h-[500px] flex-col">
      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — Term selector */}
        <div className="flex w-[240px] shrink-0 flex-col border-r border-primary-500/60 bg-gray-100">
          <div className="flex h-10 shrink-0 items-center border-b border-primary-500/30 px-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold leading-[15px] text-primary-700">Select Term</div>
              <div className="truncate text-[11px] text-gray-500">Please select below</div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {annotations.map(annotation => {
              const isSelected = selectedTerm?.uid === annotation.uid
              return (
                <div
                  key={annotation.uid}
                  onClick={() => handleSelectTerm(annotation)}
                  className={`flex cursor-pointer items-center border-b border-primary-500/20 px-3 py-2.5 text-xs ${
                    isSelected ? 'font-bold text-black' : 'text-gray-600 hover:text-black'
                  }`}
                >
                  <FaCheckCircle
                    size={12}
                    className={`mr-2 shrink-0 text-green-500 ${isSelected ? '' : 'invisible'}`}
                  />
                  <span className="min-w-0 break-words">{annotation.term.label}</span>
                </div>
              )
            })}
            {annotations.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-gray-400">No terms found</div>
            )}
          </div>
        </div>

        {/* Right panel — Evidence table */}
        <div className="flex flex-1 flex-col">
          <div className="flex h-10 shrink-0 items-center border-b border-primary-500/30 px-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold leading-[15px] text-primary-700">
                Select Evidence <span className="font-normal text-gray-500">(optional)</span>
              </div>
              <div className="truncate text-[11px] text-gray-500">
                {selectedTerm?.term.label ?? '—'}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full table-fixed border-collapse text-xs text-black">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="h-[30px] border-b border-primary-500/40">
                  <th className="w-[36px] px-2.5 text-left">
                    {evidences.length > 0 && (
                      <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected}
                        onChange={handleMasterToggle}
                      />
                    )}
                  </th>
                  <th className="w-2/5 px-2.5 text-left text-[11px] font-bold uppercase text-primary-600">
                    Evidence
                  </th>
                  <th className="w-1/5 px-2.5 text-left text-[11px] font-bold uppercase text-primary-600">
                    Reference
                  </th>
                  <th className="w-1/5 px-2.5 text-left text-[11px] font-bold uppercase text-primary-600">
                    With
                  </th>
                  <th className="px-2.5 text-left text-[11px] font-bold uppercase text-primary-600">
                    Assigned By
                  </th>
                </tr>
              </thead>
              <tbody>
                {evidences.map(ev => {
                  const isChecked = selectedEvidences.some(e => e.uid === ev.uid)
                  return (
                    <tr
                      key={ev.uid}
                      onClick={() => handleEvidenceToggle(ev)}
                      className="cursor-pointer border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-2.5 py-2 align-middle">
                        <Checkbox
                          checked={isChecked}
                          onChange={() => handleEvidenceToggle(ev)}
                          onClick={e => e.stopPropagation()}
                        />
                      </td>
                      <td className="break-words px-2.5 py-2 align-middle">
                        {ev.evidenceCode.label}
                      </td>
                      <td className="break-words px-2.5 py-2 align-middle">{ev.reference}</td>
                      <td className="break-words px-2.5 py-2 align-middle">{ev.with}</td>
                      <td className="break-words px-2.5 py-2 align-middle">
                        {ev.groups?.map(g => g.label).join(', ')}
                      </td>
                    </tr>
                  )
                })}
                {selectedTerm && evidences.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-2.5 py-4 text-center text-gray-400">
                      No evidence available for this term
                    </td>
                  </tr>
                )}
                {!selectedTerm && (
                  <tr>
                    <td colSpan={5} className="px-2.5 py-4 text-center text-gray-400">
                      Please select a term to view evidence
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex shrink-0 justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
        <Button variant="outline" onClick={() => dispatch(closeDialog())}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!selectedTerm || selectedEvidences.length === 0}
          variant="filled"
        >
          Done
        </Button>
      </div>
    </div>
  )
}

export default SearchAnnotations
