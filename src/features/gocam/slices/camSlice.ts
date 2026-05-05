import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice, createSelector } from '@reduxjs/toolkit'
import type { GraphModel, Activity } from '../models/cam'
import type { GOlrResponse } from '@/features/search/models/search'

interface CamState {
  model: GraphModel | null
  loading: boolean
  error: string | null
  selectedActivityId: string | null
}

const initialState: CamState = {
  model: null,
  loading: false,
  error: null,
  selectedActivityId: null,
}

export const camSlice = createSlice({
  name: 'cam',
  initialState,
  reducers: {
    setModel: (state, action: PayloadAction<GraphModel>) => {
      state.model = action.payload
    },
    setSelectedActivity: (state, action: PayloadAction<string | null>) => {
      state.selectedActivityId = action.payload
    },
  },
})

export const {
  setModel,
  setSelectedActivity,
} = camSlice.actions

// ── Base selectors ─────────────────────────────────────────────────

export const selectCamModel = (state: { cam: CamState }) => state.cam.model
const selectSelectedActivityId = (state: { cam: CamState }) =>
  state.cam.selectedActivityId

// ── Derived selectors ──────────────────────────────────────────────

export const selectSelectedActivity = createSelector(
  [selectCamModel, selectSelectedActivityId],
  (model, id): Activity | null => {
    if (!model || !id) return null
    return model.activities.find(a => a.uid === id) ?? null
  }
)

// ── Model data selectors ───────────────────────────────────────────

/** Unique terms from all activities, filtered by rootTypes overlap */
export const makeSelectModelTerms = () =>
  createSelector(
    [selectCamModel, (_state: { cam: CamState }, rootTypeIds: string[]) => rootTypeIds],
    (model, rootTypeIds): GOlrResponse[] => {
      if (!model) return []
      const seen = new Set<string>()
      const results: GOlrResponse[] = []
      for (const activity of model.activities) {
        for (const node of activity.nodes) {
          if (!node.id || !node.label || seen.has(node.id)) continue
          if (
            rootTypeIds.length > 0 &&
            !node.rootTypes.some(rt => rootTypeIds.includes(rt))
          )
            continue
          seen.add(node.id)
          results.push(nodeToOption(node))
        }
      }
      return results
    }
  )

/** Unique evidence codes from all edges in the model */
export const selectModelEvidence = createSelector(
  [selectCamModel],
  (model): GOlrResponse[] => {
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
)

function nodeToOption(node: { id: string; label: string }): GOlrResponse {
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

export default camSlice.reducer
