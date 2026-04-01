import { globalKnownRelations } from '@/@noctua.core/data/relations'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import type { Activity, UserContext } from '@/features/gocam/models/cam'
import { RootTypes } from '@/features/gocam/models/cam'
import { useMemo, useEffect, useCallback } from 'react'
import {
  ConnectorType,
  ActivityRelationshipId,
  ActivityMoleculeRelationshipId,
  MoleculeActivityRelationshipId,
  definitions,
  EffectDirectionId,
  DirectnessId,
} from '../models/decisionTree'
import { getConnectorType, reverseLookup } from '../services/decisionTree'
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
import TermAutocomplete from '@/features/search/components/Autocomplete2'
import { AutocompleteType } from '@/features/search/models/search'
import type { GOlrResponse } from '@/features/search/models/search'
import ReferenceField from '@/features/gocam/components/forms/ReferenceField'
import WithField from '@/features/gocam/components/forms/WithField'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import { FiX, FiPlus } from 'react-icons/fi'
import type { RootState } from '@/app/store/store'
import { openDialog } from '@/@noctua.core/components/dialog/dialogSlice'
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
  const { selected, relation, connectorEvidences } = useAppSelector(
    (state: RootState) => state.relation
  )
  const model = useAppSelector((state: RootState) => state.cam.model)
  const authUser = useAppSelector((state: RootState) => state.auth.user)
  const [updateGraphModel, { isLoading: isSaving }] = useUpdateGraphModelMutation()

  const userContext: UserContext | undefined = useMemo(() => {
    if (!authUser?.uri || !authUser?.group?.id) return undefined
    return { orcid: authUser.uri, groupUrl: authUser.group.id }
  }, [authUser])

  const connectorType = useMemo(
    () => getConnectorType(sourceActivity.type, targetActivity.type),
    [sourceActivity.type, targetActivity.type]
  )

  // Initialize form when connection changes (not on every model refresh)
  useEffect(() => {
    dispatch(
      resetSelection({
        sourceType: sourceActivity.type,
        targetType: targetActivity.type,
      })
    )

    // Pre-populate from existing edge
    if (existingEdgeId) {
      const lookup = reverseLookup(existingEdgeId as any)
      if (lookup) {
        dispatch(
          updateSelection({
            relationshipId: lookup.relationshipId,
            directionId: lookup.directionId,
            directnessId: lookup.directnessId,
          })
        )
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, sourceActivity.type, targetActivity.type, existingEdgeId])

  // Pre-populate evidence from existing connection (only on mount)
  useEffect(() => {
    if (existingEdgeId && existingSourceUid && existingTargetUid) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, existingEdgeId, existingSourceUid, existingTargetUid])

  const relationshipOptions =
    connectorType === ConnectorType.ACTIVITY_ACTIVITY
      ? Object.values(ActivityRelationshipId)
      : connectorType === ConnectorType.ACTIVITY_MOLECULE
        ? Object.values(ActivityMoleculeRelationshipId)
        : Object.values(MoleculeActivityRelationshipId)

  const definitionMap =
    definitions[
      connectorType === ConnectorType.ACTIVITY_ACTIVITY
        ? 'activityRelationship'
        : connectorType === ConnectorType.ACTIVITY_MOLECULE
          ? 'activityMoleculeRelationship'
          : 'moleculeActivityRelationship'
    ]

  const shouldShowDirection =
    connectorType === ConnectorType.ACTIVITY_ACTIVITY &&
    selected.relationshipId === ActivityRelationshipId.REGULATION
      ? true
      : connectorType === ConnectorType.MOLECULE_ACTIVITY &&
          selected.relationshipId === MoleculeActivityRelationshipId.REGULATES
        ? true
        : selected.relationshipId === ActivityRelationshipId.UNDETERMINED

  const shouldShowDirectness =
    connectorType === ConnectorType.ACTIVITY_ACTIVITY &&
    selected.relationshipId === ActivityRelationshipId.REGULATION

  const shouldShowChemicalIntermediate =
    connectorType === ConnectorType.ACTIVITY_ACTIVITY &&
    selected.relationshipId === ActivityRelationshipId.PROVIDES_INPUT_FOR

  const handleOpenChemicalConnector = useCallback(() => {
    dispatch(
      openDialog({
        component: 'ChemicalConnectorForm',
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
            variant="contained"
            onClick={handleOpenChemicalConnector}
            className="!normal-case"
            sx={{ backgroundColor: '#15803d', '&:hover': { backgroundColor: '#166534' } }}
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
                onOpenTermDetails={() => {}}
              />
            </div>
            <div className="w-1/4 p-4">
              <ReferenceField
                value={ev.reference || ''}
                onChange={value => handleEvidenceFieldChange(index, 'reference', value)}
              />
            </div>
            <div className="w-[20%] p-4">
              <WithField
                value={ev.withFrom || ''}
                onChange={value => handleEvidenceFieldChange(index, 'withFrom', value)}
              />
            </div>
            <IconButton
              size="small"
              onClick={() => dispatch(removeConnectorEvidence(index))}
              className="!text-gray-400 hover:!text-red-500"
            >
              <FiX size={14} />
            </IconButton>
          </div>
        ))}
        <Button
          size="small"
          startIcon={<FiPlus />}
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
            <Button variant="text" color="warning" size="small">
              Why is the &quot;Save&quot; button disabled?
            </Button>
          )}
          {existingEdgeId && (
            <Button
              variant="outlined"
              size="small"
              color="error"
              onClick={handleDelete}
              disabled={isSaving}
            >
              Delete
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {onClose && (
            <Button variant="outlined" size="small" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
          )}
          <Button
            variant="contained"
            size="small"
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

/* ── Sub-components ─────────────────────────────────────────── */

const SectionRow: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="border-b border-blue-800/70">
    <div className="flex items-start gap-3 px-4 py-2">
      <span className="w-[100px] shrink-0 pt-1.5 text-xs font-medium text-blue-800">
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  </div>
)

interface PillOption {
  value: string
  label: string
  description?: string
}

const RadioPillGroup: React.FC<{
  name: string
  value: string
  options: PillOption[]
  onChange: (value: string) => void
}> = ({ name, value, options, onChange }) => (
  <div className="flex flex-col py-1">
    {options.map((opt, index) => {
      const isSelected = value === opt.value
      return (
        <div
          key={opt.value}
          className="flex w-full items-center py-[5px]"
          style={{
            borderBottom:
              index < options.length - 1 ? '1px solid rgba(59,89,152,0.6)' : 'none',
          }}
        >
          <label className="flex w-[170px] shrink-0 cursor-pointer items-center gap-2 text-xs">
            <span
              className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 ${isSelected ? 'border-blue-800' : 'border-gray-400'}`}
            >
              {isSelected && (
                <span
                  className="block h-[10px] w-[10px] rounded-full bg-blue-800"
                />
              )}
            </span>
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={isSelected}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            <span style={{ color: '#333' }}>{opt.label}</span>
          </label>
          {opt.description && (
            <span
              className="ml-3 max-w-[300px] grow text-xs italic text-neutral-500"
            >
              {opt.description}
            </span>
          )}
        </div>
      )
    })}
  </div>
)

export default RelationForm
