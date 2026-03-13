import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { GraphModel, Activity, Edge } from '../models/cam'

export interface SelectedConnection {
  sourceActivity: Activity
  targetActivity: Activity
  edge: Edge
}

interface CamState {
  model: GraphModel | null
  loading: boolean
  error: string | null
  selectedActivity: Activity | null
  selectedConnection: SelectedConnection | null
}

const initialState: CamState = {
  model: null,
  loading: false,
  error: null,
  selectedActivity: null,
  selectedConnection: null,
}

export const camSlice = createSlice({
  name: 'cam',
  initialState,
  reducers: {
    setModel: (state, action: PayloadAction<GraphModel>) => {
      state.model = action.payload
      // Keep selectedActivity in sync with the fresh model data
      if (state.selectedActivity) {
        const freshActivity = action.payload.activities.find(
          a => a.rootNode.uid === state.selectedActivity!.rootNode.uid
        )
        state.selectedActivity = freshActivity ?? null
      }
      // Keep selectedConnection in sync
      if (state.selectedConnection) {
        const freshSource = action.payload.activities.find(
          a => a.rootNode.uid === state.selectedConnection!.sourceActivity.rootNode.uid
        )
        const freshTarget = action.payload.activities.find(
          a => a.rootNode.uid === state.selectedConnection!.targetActivity.rootNode.uid
        )
        if (freshSource && freshTarget) {
          const freshEdge = action.payload.activityConnections.find(
            c =>
              c.sourceId === state.selectedConnection!.edge.sourceId &&
              c.targetId === state.selectedConnection!.edge.targetId
          )
          if (freshEdge) {
            state.selectedConnection = {
              sourceActivity: freshSource,
              targetActivity: freshTarget,
              edge: freshEdge,
            }
          } else {
            state.selectedConnection = null
          }
        } else {
          state.selectedConnection = null
        }
      }
    },
    setSelectedActivity: (state, action: PayloadAction<Activity | null>) => {
      state.selectedActivity = action.payload
      if (action.payload) state.selectedConnection = null
    },
    setSelectedConnection: (state, action: PayloadAction<SelectedConnection | null>) => {
      state.selectedConnection = action.payload
      if (action.payload) state.selectedActivity = null
    },
    addActivity: (state, action: PayloadAction<Activity>) => {
      if (state.model) {
        state.model.activities.push(action.payload)
      }
    },
    addEdge: (state, action: PayloadAction<Edge>) => {
      if (state.model) {
        state.model.activityConnections.push(action.payload)
      }
    },
    updateActivity: (state, action: PayloadAction<Activity>) => {
      if (state.model) {
        const index = state.model.activities.findIndex(a => a.uid === action.payload.uid)
        if (index !== -1) {
          state.model.activities[index] = action.payload
        }
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
  },
})

export const {
  setModel,
  setSelectedActivity,
  setSelectedConnection,
  addActivity,
  addEdge,
  updateActivity,
  setLoading,
  setError,
} = camSlice.actions

export const selectCamModel = (state: { cam: CamState }) => state.cam.model
export const selectSelectedActivity = (state: { cam: CamState }) => state.cam.selectedActivity
export const selectSelectedConnection = (state: { cam: CamState }) => state.cam.selectedConnection

export default camSlice.reducer
