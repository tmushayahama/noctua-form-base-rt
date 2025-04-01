import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { GraphModel, Activity } from '../models/cam';

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
}

export const camSlice = createSlice({
  name: 'cam',
  initialState,
  reducers: {
    setModel: (state, action: PayloadAction<GraphModel>) => {
      state.model = action.payload
    },
    setSelectedActivity: (state, action: PayloadAction<Activity | null>) => {
      state.selectedActivity = action.payload
    },
  },
})

export const { setModel, setSelectedActivity } = camSlice.actions
export const selectCamModel = (state: any) => state.cam.model
export const selectSelectedActivity = (state: any) => state.cam.selectedActivity

export default camSlice.reducer