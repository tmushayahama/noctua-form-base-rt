import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { GraphModel, Activity, Edge, GraphNode } from '../models/cam'
import type { GOlrResponse } from '@/features/search/models/search'

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

/** Convert a GraphNode to a minimal GOlrResponse for autocomplete prefetch */
function nodeToOption(node: GraphNode): GOlrResponse {
  return {
    id: node.id,
    label: node.label,
    link: '',
    description: '',
    isObsolete: false,
    replacedBy: '',
    rootTypes: [],
    xref: '',
    notAnnotatable: true,
    neighborhoodGraphJson: '',
  }
}

/** Unique terms from all activities, filtered by rootTypes overlap */
export function getModelTerms(model: GraphModel | null, rootTypeIds: string[]): GOlrResponse[] {
  if (!model) return []
  const seen = new Set<string>()
  const results: GOlrResponse[] = []
  for (const activity of model.activities) {
    for (const node of activity.nodes) {
      if (!node.id || !node.label || seen.has(node.id)) continue
      if (rootTypeIds.length > 0 && !node.rootTypes.some(rt => rootTypeIds.includes(rt))) continue
      seen.add(node.id)
      results.push(nodeToOption(node))
    }
  }
  return results
}

/** Unique evidence codes from all edges in the model */
export function getModelEvidence(model: GraphModel | null): GOlrResponse[] {
  if (!model) return []
  const seen = new Set<string>()
  const results: GOlrResponse[] = []
  for (const activity of model.activities) {
    for (const edge of activity.edges) {
      if (!edge.evidence) continue
      for (const ev of edge.evidence) {
        if (!ev.evidenceCode?.id || seen.has(ev.evidenceCode.id)) continue
        seen.add(ev.evidenceCode.id)
        results.push({
          id: ev.evidenceCode.id,
          label: ev.evidenceCode.label,
          link: '',
          description: '',
          isObsolete: false,
          replacedBy: '',
          rootTypes: [],
          xref: '',
          notAnnotatable: true,
          neighborhoodGraphJson: '',
        })
      }
    }
  }
  return results
}

export default camSlice.reducer
