import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { GraphModel, Activity, Edge } from '../models/cam';

interface CamState {
  model: GraphModel | null;
  loading: boolean;
  error: string | null;
  selectedActivity: Activity | null;
}

const initialState: CamState = {
  model: null,
  loading: false,
  error: null,
  selectedActivity: null,
};

export const camSlice = createSlice({
  name: 'cam',
  initialState,
  reducers: {
    setModel: (state, action: PayloadAction<GraphModel>) => {
      state.model = action.payload;
    },
    setSelectedActivity: (state, action: PayloadAction<Activity | null>) => {
      state.selectedActivity = action.payload;
    },
    addActivity: (state, action: PayloadAction<Activity>) => {
      if (state.model) {
        state.model.activities.push(action.payload);
      }
    },
    addEdge: (state, action: PayloadAction<Edge>) => {
      if (state.model) {
        state.model.activityConnections.push(action.payload);
      }
    },
    updateActivity: (state, action: PayloadAction<Activity>) => {
      if (state.model) {
        const index = state.model.activities.findIndex(a => a.uid === action.payload.uid);
        if (index !== -1) {
          state.model.activities[index] = action.payload;
        }
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    }
  },
});

export const {
  setModel,
  setSelectedActivity,
  addActivity,
  addEdge,
  updateActivity,
  setLoading,
  setError
} = camSlice.actions;

export const selectCamModel = (state: { cam: CamState }) => state.cam.model;
export const selectSelectedActivity = (state: { cam: CamState }) => state.cam.selectedActivity;

export default camSlice.reducer;