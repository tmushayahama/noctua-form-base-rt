import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { GraphModel } from '../models/cam';

interface CamState {
  model: GraphModel | null;
  loading: boolean
  error: string | null
}

const initialState: CamState = {
  model: null,
  loading: false,
  error: null,
}

export const camSlice = createSlice({
  name: 'cam',
  initialState,
  reducers: {
    setModel: (state, action: PayloadAction<GraphModel>) => {
      state.model = action.payload
    },
  },
})

export const { setModel } = camSlice.actions
export default camSlice.reducer