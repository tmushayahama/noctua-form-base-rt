import { ActivityType } from "@/features/gocam/models/cam";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";
import { getConnectorType, getDefaultSelection, determineRelation } from "../services/decisionTree";
import type { ActivityMoleculeRelationshipId, ActivityRelationshipId, DirectnessId, EffectDirectionId, MoleculeActivityRelationshipId, RelationId } from "../models/decisionTree";


export interface RelationshipInput {
  sourceType: ActivityType;
  targetType: ActivityType;
  relationshipId: ActivityRelationshipId | ActivityMoleculeRelationshipId | MoleculeActivityRelationshipId;
  directionId?: EffectDirectionId;
  directnessId?: DirectnessId;
}

interface RelationState {
  selected: RelationshipInput;
  relation: RelationId | null;
}

const initialSourceType = ActivityType.ACTIVITY;
const initialTargetType = ActivityType.ACTIVITY;

const initialConnectorType = getConnectorType(initialSourceType, initialTargetType);
const initialDefaults = getDefaultSelection(initialConnectorType);

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
};

export const relationSlice = createSlice({
  name: 'relation',
  initialState,
  reducers: {
    updateSelection: (state, action: PayloadAction<Partial<RelationshipInput>>) => {
      state.selected = { ...state.selected, ...action.payload };
      state.relation = determineRelation(state.selected);
    },
    updateRelationFromId: (state, action: PayloadAction<RelationId>) => {
      state.relation = action.payload;
    },
    resetSelection: (state, action: PayloadAction<{ sourceType: ActivityType; targetType: ActivityType }>) => {
      const { sourceType, targetType } = action.payload;
      const connectorType = getConnectorType(sourceType, targetType);
      const defaultSelection = getDefaultSelection(connectorType);

      const fullSelection: RelationshipInput = {
        sourceType,
        targetType,
        ...defaultSelection,
      };

      state.selected = fullSelection;
      state.relation = determineRelation(fullSelection);
    },
  },
});

export const { updateSelection, updateRelationFromId, resetSelection } = relationSlice.actions;
export default relationSlice.reducer;
