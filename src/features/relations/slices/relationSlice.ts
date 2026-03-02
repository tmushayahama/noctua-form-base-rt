import { ActivityType } from '@/features/gocam/models/cam'
import type { EvidenceForm } from '@/features/gocam/models/cam'
import { createEmptyEvidence } from '@/features/gocam/models/cam'
import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import { getConnectorType, getDefaultSelection, determineRelation } from '../services/decisionTree'
import type {
  ActivityMoleculeRelationshipId,
  ActivityRelationshipId,
  DirectnessId,
  EffectDirectionId,
  MoleculeActivityRelationshipId,
  RelationId,
} from '../models/decisionTree'
import type { GOlrResponse } from '@/features/search/models/search'

export interface RelationshipInput {
  sourceType: ActivityType
  targetType: ActivityType
  relationshipId:
    | ActivityRelationshipId
    | ActivityMoleculeRelationshipId
    | MoleculeActivityRelationshipId
  directionId?: EffectDirectionId
  directnessId?: DirectnessId
}

interface RelationState {
  selected: RelationshipInput
  relation: RelationId | null
  connectorEvidences: EvidenceForm[]
}

const initialSourceType = ActivityType.ACTIVITY
const initialTargetType = ActivityType.ACTIVITY

const initialConnectorType = getConnectorType(initialSourceType, initialTargetType)
const initialDefaults = getDefaultSelection(initialConnectorType)

const initialState: RelationState = {
  selected: {
    sourceType: initialSourceType,
    targetType: initialTargetType,
    ...initialDefaults,
  },
  relation: determineRelation({
    sourceType: initialSourceType,
    targetType: initialTargetType,
    ...initialDefaults,
  }),
  connectorEvidences: [createEmptyEvidence()],
}

export const relationSlice = createSlice({
  name: 'relation',
  initialState,
  reducers: {
    updateSelection: (state, action: PayloadAction<Partial<RelationshipInput>>) => {
      state.selected = { ...state.selected, ...action.payload }
      state.relation = determineRelation(state.selected)
    },
    updateRelationFromId: (state, action: PayloadAction<RelationId>) => {
      state.relation = action.payload
    },
    resetSelection: (
      state,
      action: PayloadAction<{
        sourceType: ActivityType
        targetType: ActivityType
      }>
    ) => {
      const { sourceType, targetType } = action.payload
      const connectorType = getConnectorType(sourceType, targetType)
      const defaultSelection = getDefaultSelection(connectorType)

      const fullSelection: RelationshipInput = {
        sourceType,
        targetType,
        ...defaultSelection,
      }

      state.selected = fullSelection
      state.relation = determineRelation(fullSelection)
      state.connectorEvidences = [createEmptyEvidence()]
    },

    // Connector evidence reducers
    addConnectorEvidence: state => {
      state.connectorEvidences.push(createEmptyEvidence())
    },
    removeConnectorEvidence: (state, action: PayloadAction<number>) => {
      const index = action.payload
      if (state.connectorEvidences.length <= 1) {
        state.connectorEvidences[0] = createEmptyEvidence()
      } else {
        state.connectorEvidences.splice(index, 1)
      }
    },
    updateConnectorEvidence: (
      state,
      action: PayloadAction<{
        evidenceIndex: number
        field: 'evidenceCode' | 'reference' | 'withFrom'
        value: GOlrResponse | string
      }>
    ) => {
      const { evidenceIndex, field, value } = action.payload
      const ev = state.connectorEvidences[evidenceIndex]
      if (!ev) return

      if (field === 'evidenceCode') {
        ev.evidenceCode = value as GOlrResponse as { id: string; label: string }
      } else {
        ev[field] = value as string
      }
    },
    resetConnectorEvidences: state => {
      state.connectorEvidences = [createEmptyEvidence()]
    },
    setConnectorEvidences: (state, action: PayloadAction<EvidenceForm[]>) => {
      state.connectorEvidences =
        action.payload.length > 0 ? action.payload : [createEmptyEvidence()]
    },
  },
})

export const {
  updateSelection,
  updateRelationFromId,
  resetSelection,
  addConnectorEvidence,
  removeConnectorEvidence,
  updateConnectorEvidence,
  resetConnectorEvidences,
  setConnectorEvidences,
} = relationSlice.actions
export default relationSlice.reducer
