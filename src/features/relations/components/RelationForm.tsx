import { globalKnownRelations } from '@/@noctua.core/data/relations'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import type { Activity } from '@/features/gocam/models/cam'
import { useMemo, useEffect } from 'react'
import {
  ConnectorType,
  ActivityRelationshipId,
  ActivityMoleculeRelationshipId,
  MoleculeActivityRelationshipId,
  definitions,
  EffectDirectionId,
  DirectnessId,
} from '../models/decisionTree'
import { getConnectorType } from '../services/decisionTree'
import { resetSelection, updateSelection } from '../slices/relationSlice'
import Button from '@mui/material/Button'

interface Props {
  sourceActivity: Activity
  targetActivity: Activity
  onClose?: () => void
  onSave?: () => void
}

const relationLabelMap = new Map<string, string>()
globalKnownRelations.forEach(r => {
  relationLabelMap.set(r.id, r.label)
})

const PRIMARY = '#3b5998'
const PRIMARY_BORDER = 'rgba(59,89,152,0.7)'
const SECTION_BG = 'rgba(121,143,184,0.3)'

const RelationForm: React.FC<Props> = ({ sourceActivity, targetActivity, onClose, onSave }) => {
  const dispatch = useAppDispatch()
  const { selected, relation } = useAppSelector(state => state.relation)

  const connectorType = useMemo(
    () => getConnectorType(sourceActivity.type, targetActivity.type),
    [sourceActivity.type, targetActivity.type]
  )

  useEffect(() => {
    dispatch(
      resetSelection({ sourceType: sourceActivity.type, targetType: targetActivity.type })
    )
  }, [dispatch, sourceActivity.type, targetActivity.type])

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
          <p className="mt-1 max-w-[300px] px-1 text-xs italic text-[#676767]">
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
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${PRIMARY_BORDER}` }}>
        <span className="w-[100px] shrink-0 text-xs font-medium" style={{ color: PRIMARY }}>
          Relation
        </span>
        <span className="text-sm font-medium text-blue-700">
          {resolvedLabel ?? 'No valid relation'}
        </span>
      </div>

      {/* Evidence section placeholder */}
      <div
        className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide"
        style={{ backgroundColor: SECTION_BG, color: PRIMARY }}
      >
        Evidence
      </div>
      <div className="px-4 py-3 text-xs italic text-gray-400">
        Evidence editing coming soon
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-gray-200 bg-gray-100 px-4 py-3">
        {onClose && (
          <Button variant="outlined" size="small" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button
          variant="contained"
          size="small"
          disabled={!relation}
          onClick={onSave}
        >
          Save
        </Button>
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
      <span
        className="w-[100px] shrink-0 pt-1.5 text-xs font-medium"
        style={{ color: PRIMARY }}
      >
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
            <span className="max-w-[300px] pt-0.5 text-xs italic text-[#676767]">
              {opt.description}
            </span>
          )}
        </div>
      )
    })}
  </div>
)

export default RelationForm
