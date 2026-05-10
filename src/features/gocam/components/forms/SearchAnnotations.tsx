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

const SectionHeader: React.FC<{ title: React.ReactNode; subtitle?: React.ReactNode }> = ({
  title,
  subtitle,
}) => (
  <div className="flex h-10 shrink-0 items-center border-b border-primary-500/30 bg-white px-3">
    <div className="min-w-0">
      <div className="text-xs font-semibold leading-[15px] text-primary-700">{title}</div>
      <div className="truncate text-[11px] italic text-gray-500">{subtitle ?? ' '}</div>
    </div>
  </div>
)

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
  const { data: annotations = [], isLoading } = useSearchAnnotationsQuery({
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
    if (allSelected) setSelectedEvidences([])
    else setSelectedEvidences([...evidences])
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
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* ── Body ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left panel — Term selector */}
        <aside className="flex w-[220px] shrink-0 flex-col border-r border-primary-500/60 bg-gray-50">
          <SectionHeader title="Select Term" subtitle="Please select below" />
          <div className="flex-1 overflow-y-auto">
            {isLoading && (
              <div className="px-3 py-6 text-center text-xs text-gray-400">Loading…</div>
            )}
            {!isLoading &&
              annotations.map(annotation => {
                const isSelected = selectedTerm?.uid === annotation.uid
                return (
                  <button
                    type="button"
                    key={annotation.uid}
                    onClick={() => handleSelectTerm(annotation)}
                    className={`flex w-full items-start gap-2 border-b border-primary-500/15 px-3 py-2.5 text-left text-xs transition-colors ${
                      isSelected
                        ? 'border-l-[3px] border-l-primary-500 bg-white pl-[9px] font-bold text-black'
                        : 'border-l-[3px] border-l-transparent text-gray-600 hover:bg-white hover:text-black'
                    }`}
                  >
                    <FaCheckCircle
                      size={12}
                      className={`mt-0.5 shrink-0 text-emerald-500 ${isSelected ? '' : 'invisible'}`}
                    />
                    <span className="min-w-0 break-words leading-snug">
                      {annotation.term.label}
                    </span>
                  </button>
                )
              })}
            {!isLoading && annotations.length === 0 && (
              <div className="px-3 py-6 text-center text-xs italic text-gray-400">
                No terms found
              </div>
            )}
          </div>
        </aside>

        {/* Right panel — Evidence table */}
        <section className="flex flex-1 flex-col bg-white">
          <SectionHeader
            title={
              <>
                Select Evidence{' '}
                <span className="font-normal text-gray-500">(optional)</span>
              </>
            }
            subtitle={selectedTerm?.term.label ?? '—'}
          />

          <div className="flex-1 overflow-y-auto">
            <table className="w-full table-fixed border-collapse text-xs text-black">
              <thead className="sticky top-0 z-10">
                <tr className="h-[30px] border-b border-primary-500/40 bg-primary-50/60">
                  <th className="w-[40px] px-2.5 text-left">
                    {evidences.length > 0 && (
                      <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected}
                        onChange={handleMasterToggle}
                      />
                    )}
                  </th>
                  <th className="w-2/5 px-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-primary-700">
                    Evidence
                  </th>
                  <th className="w-1/5 px-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-primary-700">
                    Reference
                  </th>
                  <th className="w-1/5 px-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-primary-700">
                    With
                  </th>
                  <th className="px-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-primary-700">
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
                      className={`cursor-pointer border-b border-gray-200 transition-colors ${
                        isChecked ? 'bg-primary-50/70' : 'hover:bg-gray-50'
                      }`}
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
                      <td className="break-words px-2.5 py-2 align-middle text-gray-700">
                        {ev.reference}
                      </td>
                      <td className="break-words px-2.5 py-2 align-middle text-gray-700">
                        {ev.with}
                      </td>
                      <td className="break-words px-2.5 py-2 align-middle text-gray-700">
                        {ev.groups?.map(g => g.label).join(', ')}
                      </td>
                    </tr>
                  )
                })}
                {selectedTerm && evidences.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-2.5 py-6 text-center italic text-gray-400">
                      No evidence available for this term
                    </td>
                  </tr>
                )}
                {!selectedTerm && (
                  <tr>
                    <td colSpan={5} className="px-2.5 py-6 text-center italic text-gray-400">
                      Please select a term to view evidence
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ── Footer ── */}
      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
        {selectedTerm && (
          <span className="mr-auto text-xs text-gray-500">
            {selectedEvidences.length > 0
              ? `${selectedEvidences.length} of ${evidences.length} evidence selected`
              : 'Select evidence (optional) to copy along with the term'}
          </span>
        )}
        <Button variant="outline" onClick={() => dispatch(closeDialog())}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!selectedTerm} variant="filled">
          Done
        </Button>
      </div>
    </div>
  )
}

export default SearchAnnotations
