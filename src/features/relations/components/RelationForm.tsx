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

const PRIMARY = '#3b5998'
const PRIMARY_BORDER = 'rgba(59,89,152,0.7)'
const SECTION_BG = 'rgba(121,143,184,0.3)'

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
        <SectionRow label="Effect/Direction">
          <RadioPillGroup
            name="effectDirection"
            value={selected.directionId || ''}
            options={Object.values(EffectDirectionId).map(dir => ({
              value: dir,
              label: definitions.effectDirection[dir].label,
            }))}
            onChange={onRadioChange('directionId')}
          />
          <p className="mt-1 max-w-[300px] px-1 text-xs italic text-gray-500">
            The mechanism of regulation should be known to determine the direction.
          </p>
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
        className="mt-2 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide"
        style={{ backgroundColor: SECTION_BG, color: PRIMARY }}
      >
        Suggested Causal Relation
      </div>
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: `1px solid ${PRIMARY_BORDER}` }}
      >
        <span className="w-[100px] shrink-0 text-xs font-medium" style={{ color: PRIMARY }}>
          Relation
        </span>
        <span className="text-sm font-medium text-blue-700">
          {resolvedLabel ?? 'No valid relation'}
        </span>
      </div>

      {/* Evidence section */}
      <div
        className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide"
        style={{ backgroundColor: SECTION_BG, color: PRIMARY }}
      >
        Evidence
      </div>
      <div className="px-4 py-2">
        {connectorEvidences.map((ev, index) => (
          <div key={ev.uid} className="mb-2 flex items-center gap-2">
            <div className="w-[220px]">
              <TermAutocomplete
                label="Evidence Code"
                name={`conn-evidence-${index}`}
                rootTypeIds={[RootTypes.EVIDENCE]}
                autocompleteType={AutocompleteType.EVIDENCE_CODE}
                value={ev.evidenceCode?.id ? ev.evidenceCode : null}
                onChange={value => handleEvidenceFieldChange(index, 'evidenceCode', value)}
                onOpenTermDetails={() => {}}
              />
            </div>
            <div className="w-[140px]">
              <ReferenceField
                value={ev.reference || ''}
                onChange={value => handleEvidenceFieldChange(index, 'reference', value)}
              />
            </div>
            <div className="w-[140px]">
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
      <div className="flex items-center justify-between gap-2 border-t border-gray-200 bg-gray-100 px-4 py-3">
        <div>
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
  <div style={{ borderBottom: `1px solid ${PRIMARY_BORDER}` }}>
    <div className="flex items-start gap-3 px-4 py-2">
      <span className="w-[100px] shrink-0 pt-1.5 text-xs font-medium" style={{ color: PRIMARY }}>
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
  <div className="flex flex-col gap-1 py-1">
    {options.map(opt => {
      const isSelected = value === opt.value
      return (
        <div key={opt.value} className="flex items-start gap-2">
          <label
            className="flex w-[170px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors"
            style={{
              borderColor: PRIMARY_BORDER,
              backgroundColor: isSelected ? PRIMARY : 'transparent',
              color: isSelected ? '#fff' : '#333',
            }}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={isSelected}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            {opt.label}
          </label>
          {opt.description && (
            <span className="max-w-[300px] pt-0.5 text-xs italic text-gray-500">
              {opt.description}
            </span>
          )}
        </div>
      )
    })}
  </div>
)

export default RelationForm
