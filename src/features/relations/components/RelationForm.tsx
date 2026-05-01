import { globalKnownRelations } from '@/@noctua.core/data/relations'
import SectionRow from './SectionRow'
import RadioPillGroup from './RadioPillGroup'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { useUserContext } from '@/app/hooks/useUserContext'
import type { Activity } from '@/features/gocam/models/cam'
import { RootTypes } from '@/features/gocam/models/cam'
import { useEffect, useCallback } from 'react'
import {
  EffectDirectionId,
  DirectnessId,
  definitions,
} from '../models/decisionTree'
import { reverseLookup } from '../services/decisionTree'
import { useRelationFormConfig } from '../hooks/useRelationFormConfig'
import {
  resetSelection,
  updateSelection,
  addConnectorEvidence,
  removeConnectorEvidence,
  updateConnectorEvidence,
  setConnectorEvidences,
} from '../slices/relationSlice'
import { useUpdateGraphModelMutation } from '@/features/gocam/slices/camApiSlice'
import {
  buildConnectorOperations,
  buildConnectorDeleteOperations,
} from '../services/connectorServices'
import TermAutocomplete from '@/features/search/components/Autocomplete'
import { AutocompleteType } from '@/features/search/models/search'
import type { GOlrResponse } from '@/features/search/models/search'
import DatabaseField from '@/features/gocam/components/forms/DatabaseField'
import { ActionIcon, Button } from '@mantine/core'
import { FiX, FiPlus } from 'react-icons/fi'
import {
  selectRelationSelected,
  selectRelation,
  selectConnectorEvidences,
} from '../slices/relationSlice'
import { selectCamModel } from '@/features/gocam/slices/camSlice'
import { openDialog, DialogComponent } from '@/@noctua.core/components/dialog/dialogSlice'
import { showToast } from '@/@noctua.core/components/toast/toastSlice'

interface Props {
  sourceActivity: Activity
  targetActivity: Activity
  existingEdgeId?: string
  existingSourceUid?: string
  existingTargetUid?: string
  onClose?: () => void
  onSaved?: () => void
}

const relationLabelMap = new Map<string, string>()
globalKnownRelations.forEach(r => {
  relationLabelMap.set(r.id, r.label)
})

const RelationForm: React.FC<Props> = ({
  sourceActivity,
  targetActivity,
  existingEdgeId,
  existingSourceUid,
  existingTargetUid,
  onClose,
  onSaved,
}) => {
  const dispatch = useAppDispatch()
  const selected = useAppSelector(selectRelationSelected)
  const relation = useAppSelector(selectRelation)
  const connectorEvidences = useAppSelector(selectConnectorEvidences)
  const model = useAppSelector(selectCamModel)
  const userContext = useUserContext()
  const [updateGraphModel, { isLoading: isSaving }] = useUpdateGraphModelMutation()

  const {
    relationshipOptions,
    definitionMap,
    shouldShowDirection,
    shouldShowDirectness,
    shouldShowChemicalIntermediate,
  } = useRelationFormConfig(sourceActivity.type, targetActivity.type, selected)

  useEffect(() => {
    dispatch(
      resetSelection({
        sourceType: sourceActivity.type,
        targetType: targetActivity.type,
      })
    )

    if (existingEdgeId) {
      const lookup = reverseLookup(existingEdgeId)
      if (lookup) {
        dispatch(
          updateSelection({
            relationshipId: lookup.relationshipId,
            directionId: lookup.directionId,
            directnessId: lookup.directnessId,
          })
        )
      }

      if (existingSourceUid && existingTargetUid) {
        const existingConn = model?.activityConnections.find(
          c => c.sourceId === existingSourceUid && c.targetId === existingTargetUid
        )
        if (existingConn?.evidence && existingConn.evidence.length > 0) {
          const evForms = existingConn.evidence.map(ev => ({
            uid: ev.uid,
            evidenceCode: ev.evidenceCode
              ? { id: ev.evidenceCode.id, label: ev.evidenceCode.label }
              : { id: '', label: '' },
            reference: ev.reference || '',
            withFrom: ev.with || '',
          }))
          dispatch(setConnectorEvidences(evForms))
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, sourceActivity.type, targetActivity.type, existingEdgeId, existingSourceUid, existingTargetUid])

  const handleOpenChemicalConnector = useCallback(() => {
    dispatch(
      openDialog({
        component: DialogComponent.CHEMICAL_CONNECTOR_FORM,
        title: 'Connect via Chemical Intermediate',
        size: 'md',
        customProps: {
          sourceActivity,
          targetActivity,
        },
      })
    )
  }, [dispatch, sourceActivity, targetActivity])

  const onRadioChange =
    (field: 'relationshipId' | 'directionId' | 'directnessId') => (value: string) => {
      dispatch(updateSelection({ [field]: value }))
    }

  const resolvedLabel = relation ? relationLabelMap.get(relation) || relation : null

  const handleSave = useCallback(async () => {
    if (!relation || !model?.id) return

    const modelId = model.id

    // If editing existing connector: delete old, add new
    if (existingEdgeId && existingSourceUid && existingTargetUid) {
      const deleteOps = buildConnectorDeleteOperations(
        existingSourceUid,
        existingTargetUid,
        existingEdgeId,
        modelId
      )
      await updateGraphModel(deleteOps).unwrap()
    }

    const ops = buildConnectorOperations(
      sourceActivity,
      targetActivity,
      relation,
      connectorEvidences,
      modelId,
      userContext
    )

    await updateGraphModel(ops).unwrap()
    dispatch(showToast({ message: 'Causal relation successfully created.' }))
    onSaved?.()
    onClose?.()
  }, [
    relation,
    model,
    sourceActivity,
    targetActivity,
    connectorEvidences,
    existingEdgeId,
    existingSourceUid,
    existingTargetUid,
    updateGraphModel,
    userContext,
    onSaved,
    onClose,
    dispatch,
  ])

  const handleDelete = useCallback(async () => {
    if (!existingEdgeId || !existingSourceUid || !existingTargetUid || !model?.id) return

    const ops = buildConnectorDeleteOperations(
      existingSourceUid,
      existingTargetUid,
      existingEdgeId,
      model.id
    )
    await updateGraphModel(ops).unwrap()
    onSaved?.()
    onClose?.()
  }, [
    existingEdgeId,
    existingSourceUid,
    existingTargetUid,
    model,
    updateGraphModel,
    onSaved,
    onClose,
  ])

  const handleEvidenceFieldChange = useCallback(
    (
      evidenceIndex: number,
      field: 'evidenceCode' | 'reference' | 'withFrom',
      value: GOlrResponse | string | null
    ) => {
      if (value === null) return
      dispatch(
        updateConnectorEvidence({
          evidenceIndex,
          field,
          value: value as GOlrResponse | string,
        })
      )
    },
    [dispatch]
  )

  return (
    <div className="flex flex-col">
      {/* Relationship section */}
      <SectionRow label="Relationship">
        <RadioPillGroup
          name="relationship"
          value={selected.relationshipId}
          options={relationshipOptions.map(key => {
            const def = definitionMap[key]
            return { value: key, label: def.label, description: def.description }
          })}
          onChange={onRadioChange('relationshipId')}
        />
      </SectionRow>

      {/* Effect Direction */}
      {shouldShowDirection && (
        <SectionRow label="Effect Direction">
          <div className="flex items-start gap-3">
            <RadioPillGroup
              name="effectDirection"
              value={selected.directionId || ''}
              options={Object.values(EffectDirectionId).map(dir => ({
                value: dir,
                label: definitions.effectDirection[dir].label,
              }))}
              onChange={onRadioChange('directionId')}
            />
            <p className="max-w-[260px] grow text-xs italic text-neutral-500">
              The mechanism regulation should be known, so it should be possible to pick the
              direction of the regulation.
            </p>
          </div>
        </SectionRow>
      )}

      {/* Directness */}
      {shouldShowDirectness && (
        <SectionRow label="Directness">
          <RadioPillGroup
            name="directness"
            value={selected.directnessId || ''}
            options={Object.values(DirectnessId).map(dir => ({
              value: dir,
              label: definitions.directness[dir].label,
              description: definitions.directness[dir].description,
            }))}
            onChange={onRadioChange('directnessId')}
          />
        </SectionRow>
      )}

      {/* Suggested Causal Relation */}
      <div
        className="mt-2 border-t border-gray-400 bg-slate-400/30 pl-3 text-xs leading-[30px] text-neutral-600"
      >
        Suggested Causal Relation
      </div>
      <div className="mb-4 py-5">
        <span className="pl-[10px] text-xs">
          {resolvedLabel ?? 'No valid relation'}
        </span>
      </div>

      {/* Chemical Intermediate section */}
      {shouldShowChemicalIntermediate && (
        <div
          className="flex items-center gap-3 border-b border-blue-800/70 px-4 py-3"
        >
          <span className="w-[100px] shrink-0 text-xs font-medium text-blue-800">
            Chemical Intermediate
          </span>
          <Button
            variant="filled"
            onClick={handleOpenChemicalConnector}
            className="!bg-green-700 hover:!bg-green-800 !normal-case"
          >
            Connect via Chemical Intermediate
          </Button>
        </div>
      )}

      {/* Evidence section */}
      <div
        className="bg-slate-400/30 pl-3 text-xs leading-[30px] text-neutral-600"
      >
        Evidence
      </div>
      <div className="px-4 py-2">
        {connectorEvidences.map((ev, index) => (
          <div key={ev.uid} className="mb-2 flex items-center gap-2">
            <div className="w-[55%] p-4">
              <TermAutocomplete
                label="Evidence"
                name={`conn-evidence-${index}`}
                rootTypeIds={[RootTypes.EVIDENCE]}
                autocompleteType={AutocompleteType.EVIDENCE_CODE}
                value={ev.evidenceCode?.id ? ev.evidenceCode : null}
                onChange={value => handleEvidenceFieldChange(index, 'evidenceCode', value)}
              />
            </div>
            <div className="w-1/4 p-4">
              <DatabaseField type="reference"
                value={ev.reference || ''}
                onChange={value => handleEvidenceFieldChange(index, 'reference', value)}
              />
            </div>
            <div className="w-[20%] p-4">
              <DatabaseField type="with"
                value={ev.withFrom || ''}
                onChange={value => handleEvidenceFieldChange(index, 'withFrom', value)}
              />
            </div>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="md"
              onClick={() => dispatch(removeConnectorEvidence(index))}
              className="!text-gray-400 hover:!text-red-500"
            >
              <FiX size={14} />
            </ActionIcon>
          </div>
        ))}
        <Button
          variant="subtle"
          size="xs"
          leftSection={<FiPlus />}
          onClick={() => dispatch(addConnectorEvidence())}
          className="!text-xs !normal-case"
        >
          Add Evidence
        </Button>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between gap-2 border-t border-gray-200 bg-gray-100 px-4 py-3"
        style={{ boxShadow: '2px -5px 2px 0px rgba(0, 0, 0, 0.26)' }}
      >
        <div>
          {!relation && (
            <Button variant="subtle" color="yellow" size="xs">
              Why is the &quot;Save&quot; button disabled?
            </Button>
          )}
          {existingEdgeId && (
            <Button
              variant="outline"
              size="xs"
              color="red"
              onClick={handleDelete}
              disabled={isSaving}
            >
              Delete
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {onClose && (
            <Button variant="outline" size="xs" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
          )}
          <Button
            variant="filled"
            size="xs"
            disabled={!relation || isSaving}
            onClick={handleSave}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default RelationForm
