import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Checkbox, CircularProgress, FormControlLabel, IconButton } from '@mui/material'
import { FiPlus, FiX } from 'react-icons/fi'
import { v4 as uuidv4 } from 'uuid'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { closeDialog } from '@/@noctua.core/components/dialog/dialogSlice'
import type { RootState } from '@/app/store/store'
import type { Activity, GraphNode, UserContext } from '@/features/gocam/models/cam'
import { RootTypes } from '@/features/gocam/models/cam'
import type { EvidenceForm } from '@/features/gocam/models/formModels'
import { useLazyGetChemicalParticipantsQuery } from '@/features/search/slices/lookupApiSlice'
import { AutocompleteType } from '@/features/search/models/search'
import type { GOlrResponse } from '@/features/search/models/search'
import TermAutocomplete from '@/features/search/components/Autocomplete2'
import ReferenceField from '@/features/gocam/components/forms/ReferenceField'
import WithField from '@/features/gocam/components/forms/WithField'
import { useUpdateGraphModelMutation } from '@/features/gocam/slices/camApiSlice'
import { buildChemicalParticipantOperations } from '../services/connectorServices'
import {
  categorizeParticipants,
  type ChemicalParticipant,
  type CategorizedParticipants,
} from '../services/chemicalConnectorUtils'

const SECTION_BG = 'rgba(121,143,184,0.3)'
const PRIMARY = '#3b5998'

interface Props {
  sourceActivity: Activity
  targetActivity: Activity
}

const ChemicalConnectorForm: React.FC<Props> = ({ sourceActivity, targetActivity }) => {
  const dispatch = useAppDispatch()
  const model = useAppSelector((state: RootState) => state.cam.model)
  const authUser = useAppSelector((state: RootState) => state.auth.user)
  const [updateGraphModel, { isLoading: isSaving }] = useUpdateGraphModelMutation()

  const userContext: UserContext | undefined = useMemo(() => {
    if (!authUser?.uri || !authUser?.group?.id) return undefined
    return { orcid: authUser.uri, groupUrl: authUser.group.id }
  }, [authUser])

  // Fetch chemical participants for both activities' MF nodes
  const [fetchSubjectParticipants, subjectQuery] = useLazyGetChemicalParticipantsQuery()
  const [fetchObjectParticipants, objectQuery] = useLazyGetChemicalParticipantsQuery()

  const [categorized, setCategorized] = useState<CategorizedParticipants | null>(null)
  const [evidences, setEvidences] = useState<EvidenceForm[]>([])

  // Trigger fetches on mount
  useEffect(() => {
    const subjectMfId = sourceActivity.molecularFunction?.id
    const objectMfId = targetActivity.molecularFunction?.id

    if (subjectMfId) fetchSubjectParticipants(subjectMfId)
    if (objectMfId) fetchObjectParticipants(objectMfId)
  }, [sourceActivity, targetActivity, fetchSubjectParticipants, fetchObjectParticipants])

  // Categorize once both fetches complete
  useEffect(() => {
    if (subjectQuery.isUninitialized || objectQuery.isUninitialized) return
    if (subjectQuery.isLoading || objectQuery.isLoading) return

    const subjectData = subjectQuery.data ?? []
    const objectData = objectQuery.data ?? []

    setCategorized(categorizeParticipants(subjectData, objectData))
  }, [
    subjectQuery.data,
    subjectQuery.isLoading,
    subjectQuery.isUninitialized,
    objectQuery.data,
    objectQuery.isLoading,
    objectQuery.isUninitialized,
  ])

  const isLoading = subjectQuery.isLoading || objectQuery.isLoading

  const allItems = useMemo(() => {
    if (!categorized) return []
    return [...categorized.common, ...categorized.subjectOnly, ...categorized.objectOnly]
  }, [categorized])

  const selectedItems = useMemo(() => allItems.filter(item => item.selected), [allItems])

  const toggleItem = useCallback(
    (id: string) => {
      if (!categorized) return
      const toggle = (items: ChemicalParticipant[]) =>
        items.map(item => (item.id === id ? { ...item, selected: !item.selected } : item))
      setCategorized({
        common: toggle(categorized.common),
        subjectOnly: toggle(categorized.subjectOnly),
        objectOnly: toggle(categorized.objectOnly),
      })
    },
    [categorized]
  )

  // Evidence management
  const addEvidence = useCallback(() => {
    setEvidences(prev => [
      ...prev,
      { uid: uuidv4(), evidenceCode: { id: '', label: '' }, reference: '', withFrom: '' },
    ])
  }, [])

  const removeEvidence = useCallback((uid: string) => {
    setEvidences(prev => prev.filter(ev => ev.uid !== uid))
  }, [])

  const updateEvidence = useCallback(
    (
      uid: string,
      field: 'evidenceCode' | 'reference' | 'withFrom',
      value: GOlrResponse | string | null
    ) => {
      if (value === null) return
      setEvidences(prev =>
        prev.map(ev => {
          if (ev.uid !== uid) return ev
          if (field === 'evidenceCode') {
            const v = value as GOlrResponse
            return { ...ev, evidenceCode: { id: v.id, label: v.label } }
          }
          return { ...ev, [field]: value as string }
        })
      )
    },
    []
  )

  const handleSave = useCallback(async () => {
    if (!model?.id || selectedItems.length === 0) return

    const subjectMfNode: GraphNode | undefined = sourceActivity.rootNode
    const objectMfNode: GraphNode | undefined = targetActivity.rootNode

    if (!subjectMfNode || !objectMfNode) return

    const ops = buildChemicalParticipantOperations(
      subjectMfNode,
      objectMfNode,
      selectedItems.map(item => ({ id: item.id, label: item.label })),
      model.id,
      userContext
    )

    await updateGraphModel(ops).unwrap()
    dispatch(closeDialog())
  }, [
    model,
    sourceActivity,
    targetActivity,
    selectedItems,
    userContext,
    updateGraphModel,
    dispatch,
  ])

  // Render helpers
  const renderSection = (title: string, items: ChemicalParticipant[]) => {
    if (items.length === 0) return null
    return (
      <div className="flex w-full flex-col items-stretch justify-start">
        <div
          className="flex items-center px-4 py-1.5 text-xs font-semibold uppercase tracking-wide"
          style={{ backgroundColor: SECTION_BG, color: PRIMARY }}
        >
          {title}
        </div>
        <div className="flex flex-col items-stretch justify-start px-4 py-1">
          {items.map(item => (
            <FormControlLabel
              key={item.id}
              control={
                <Checkbox
                  checked={item.selected}
                  onChange={() => toggleItem(item.id)}
                  size="small"
                />
              }
              label={
                <span className="text-sm">
                  {item.label} ({item.id})
                </span>
              }
            />
          ))}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <CircularProgress size={24} />
        <span className="ml-2 text-sm text-gray-500">Loading chemical participants...</span>
      </div>
    )
  }

  const hasNoParticipants =
    categorized &&
    categorized.common.length === 0 &&
    categorized.subjectOnly.length === 0 &&
    categorized.objectOnly.length === 0

  return (
    <div className="flex flex-col">
      {/* Body */}
      <div className="flex flex-col items-stretch justify-start">
        {hasNoParticipants ? (
          <div className="px-4 py-6 text-center text-sm text-gray-500">
            No chemical participants found for these molecular functions.
          </div>
        ) : (
          <>
            {categorized &&
              renderSection(
                'Participants common to upstream and downstream activities',
                categorized.common
              )}
            {categorized &&
              renderSection('Participants in upstream activity only', categorized.subjectOnly)}
            {categorized &&
              renderSection('Participants in downstream activity only', categorized.objectOnly)}

            {/* Info messages for missing sides */}
            {categorized &&
              categorized.subjectOnly.length === 0 &&
              categorized.objectOnly.length > 0 && (
                <div className="px-4 py-2 text-xs italic text-gray-400">
                  No participants found for upstream activity
                </div>
              )}
            {categorized &&
              categorized.objectOnly.length === 0 &&
              categorized.subjectOnly.length > 0 && (
                <div className="px-4 py-2 text-xs italic text-gray-400">
                  No participants found for downstream activity
                </div>
              )}

            {/* Evidence section */}
            <div
              className="mt-2 flex items-center px-4 py-1.5 text-xs font-semibold uppercase tracking-wide"
              style={{ backgroundColor: SECTION_BG, color: PRIMARY }}
            >
              Evidence
            </div>
            <div className="px-4 py-2">
              {evidences.map(ev => (
                <div key={ev.uid} className="mb-2 flex items-center gap-2">
                  <div className="w-[220px]">
                    <TermAutocomplete
                      label="Evidence Code"
                      name={`chem-ev-${ev.uid}`}
                      rootTypeIds={[RootTypes.EVIDENCE]}
                      autocompleteType={AutocompleteType.EVIDENCE_CODE}
                      value={ev.evidenceCode?.id ? ev.evidenceCode : null}
                      onChange={value => updateEvidence(ev.uid, 'evidenceCode', value)}
                      onOpenTermDetails={() => {}}
                    />
                  </div>
                  <div className="w-[140px]">
                    <ReferenceField
                      value={ev.reference}
                      onChange={value => updateEvidence(ev.uid, 'reference', value)}
                    />
                  </div>
                  <div className="w-[140px]">
                    <WithField
                      value={ev.withFrom}
                      onChange={value => updateEvidence(ev.uid, 'withFrom', value)}
                    />
                  </div>
                  <IconButton
                    size="small"
                    onClick={() => removeEvidence(ev.uid)}
                    className="!text-gray-400 hover:!text-red-500"
                  >
                    <FiX size={14} />
                  </IconButton>
                </div>
              ))}
              <Button
                size="small"
                startIcon={<FiPlus />}
                onClick={addEvidence}
                className="!text-xs !normal-case"
              >
                Add Evidence
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-gray-200 bg-gray-100 px-4 py-3">
        <Button
          variant="contained"
          size="small"
          disabled={selectedItems.length === 0 || isSaving}
          onClick={handleSave}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}

export default ChemicalConnectorForm
