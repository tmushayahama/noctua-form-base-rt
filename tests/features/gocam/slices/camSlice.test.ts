import { describe, it, expect } from 'vitest'
import camReducer, {
  setModel,
  setSelectedActivity,
  selectCamModel,
  selectSelectedActivity,
  selectModelEvidence,
  makeSelectModelTerms,
} from '@/features/gocam/slices/camSlice'
import type { Edge } from '@/features/gocam/models/cam'
import {
  buildActivity,
  buildEdgeWithEvidence,
  buildModel,
  buildNode,
} from '@tests/fixtures/builders'

const initial = camReducer(undefined, { type: '@@INIT' })

describe('camSlice reducers', () => {
  it('starts with null model and no selected activity', () => {
    expect(initial).toEqual({
      model: null,
      loading: false,
      error: null,
      selectedActivityId: null,
    })
  })

  it('setModel stores the graph model on state', () => {
    const m = buildModel([])
    const next = camReducer(initial, setModel(m))
    expect(next.model).toBe(m)
  })

  it('setSelectedActivity stores the activity id', () => {
    const next = camReducer(initial, setSelectedActivity('act-1'))
    expect(next.selectedActivityId).toBe('act-1')
  })

  it('setSelectedActivity(null) clears the selection', () => {
    const withSelection = camReducer(initial, setSelectedActivity('act-1'))
    const cleared = camReducer(withSelection, setSelectedActivity(null))
    expect(cleared.selectedActivityId).toBeNull()
  })

  it('setModel overwrites a previously set model', () => {
    const first = buildModel([])
    const second = buildModel([buildActivity('a', [buildNode('GO:1', 'Foo')])])
    const after = camReducer(camReducer(initial, setModel(first)), setModel(second))
    expect(after.model).toBe(second)
  })

  it('setSelectedActivity preserves loading and error fields', () => {
    const seeded = { ...initial, loading: true, error: 'boom' }
    const next = camReducer(seeded, setSelectedActivity('act-1'))
    expect(next.loading).toBe(true)
    expect(next.error).toBe('boom')
  })

  it('setModel preserves selection, loading, and error', () => {
    const seeded = { ...initial, selectedActivityId: 'keep', loading: true, error: 'boom' }
    const next = camReducer(seeded, setModel(buildModel([])))
    expect(next.selectedActivityId).toBe('keep')
    expect(next.loading).toBe(true)
    expect(next.error).toBe('boom')
  })
})

describe('camSlice selectCamModel', () => {
  it('returns null when no model is loaded', () => {
    expect(selectCamModel({ cam: initial })).toBeNull()
  })

  it('returns the model when loaded', () => {
    const m = buildModel([])
    expect(selectCamModel({ cam: { ...initial, model: m } })).toBe(m)
  })
})

describe('camSlice selectSelectedActivity', () => {
  it('returns null when no model is loaded', () => {
    expect(selectSelectedActivity({ cam: initial })).toBeNull()
  })

  it('returns null when nothing is selected', () => {
    const state = { cam: { ...initial, model: buildModel([]) } }
    expect(selectSelectedActivity(state)).toBeNull()
  })

  it('returns the matching activity by uid', () => {
    const a = buildActivity('act-1', [buildNode('GO:1', 'Foo')])
    const b = buildActivity('act-2', [buildNode('GO:2', 'Bar')])
    const state = {
      cam: { ...initial, model: buildModel([a, b]), selectedActivityId: 'act-2' },
    }
    expect(selectSelectedActivity(state)).toBe(b)
  })

  it('returns null when the selected id matches no activity', () => {
    const a = buildActivity('act-1', [buildNode('GO:1', 'Foo')])
    const state = {
      cam: { ...initial, model: buildModel([a]), selectedActivityId: 'missing' },
    }
    expect(selectSelectedActivity(state)).toBeNull()
  })
})

describe('camSlice selectModelEvidence', () => {
  it('returns empty array when model is null', () => {
    expect(selectModelEvidence({ cam: initial })).toEqual([])
  })

  it('returns unique evidence codes across edges', () => {
    const eco1 = { id: 'ECO:0000314', label: 'IDA' }
    const eco2 = { id: 'ECO:0000353', label: 'IPI' }
    const edges = [
      buildEdgeWithEvidence('e1', [eco1, eco2]),
      buildEdgeWithEvidence('e2', [eco1]),
    ]
    const a = buildActivity('act-1', [buildNode('GO:1', 'Foo')], edges)
    const state = { cam: { ...initial, model: buildModel([a]) } }

    const result = selectModelEvidence(state)
    expect(result).toHaveLength(2)
    expect(new Set(result.map(r => r.id))).toEqual(new Set(['ECO:0000314', 'ECO:0000353']))
  })

  it('skips edges without evidence', () => {
    const edge: Edge = {
      uid: 'edge_no_ev',
      id: 'no-ev',
      label: '',
      sourceId: 's',
      targetId: 't',
      source: buildNode('s', 'S'),
      target: buildNode('t', 'T'),
      contributors: [],
      groups: [],
    }
    const a = buildActivity('act-1', [buildNode('GO:1', 'Foo')], [edge])
    const state = { cam: { ...initial, model: buildModel([a]) } }
    expect(selectModelEvidence(state)).toEqual([])
  })
})

describe('camSlice makeSelectModelTerms', () => {
  it('returns empty array when model is null', () => {
    const select = makeSelectModelTerms()
    expect(select({ cam: initial }, [])).toEqual([])
  })

  it('returns unique terms across activities (deduped by id)', () => {
    const n1 = buildNode('GO:0003674', 'molecular_function', ['GO:0003674'])
    const n2 = buildNode('GO:0008150', 'biological_process', ['GO:0008150'])
    const dup = buildNode('GO:0003674', 'molecular_function', ['GO:0003674'])
    const a = buildActivity('act-1', [n1])
    const b = buildActivity('act-2', [n2, dup])
    const state = { cam: { ...initial, model: buildModel([a, b]) } }

    const select = makeSelectModelTerms()
    const ids = select(state, []).map(r => r.id).sort()
    expect(ids).toEqual(['GO:0003674', 'GO:0008150'])
  })

  it('filters terms by rootTypes overlap when filter is non-empty', () => {
    const mf = buildNode('GO:1', 'function', ['GO:0003674'])
    const bp = buildNode('GO:2', 'process', ['GO:0008150'])
    const a = buildActivity('act-1', [mf, bp])
    const state = { cam: { ...initial, model: buildModel([a]) } }

    const select = makeSelectModelTerms()
    expect(select(state, ['GO:0003674']).map(r => r.id)).toEqual(['GO:1'])
  })

  it('skips nodes with empty id or empty label', () => {
    const valid = buildNode('GO:1', 'Foo', ['GO:0003674'])
    const noId = buildNode('', 'NoId', ['GO:0003674'])
    const noLabel = buildNode('GO:2', '', ['GO:0003674'])
    const a = buildActivity('act-1', [valid, noId, noLabel])
    const state = { cam: { ...initial, model: buildModel([a]) } }

    const select = makeSelectModelTerms()
    expect(select(state, []).map(r => r.id)).toEqual(['GO:1'])
  })

  it('memoizes within an instance when state and args are unchanged', () => {
    const a = buildActivity('act-1', [buildNode('GO:1', 'Foo', ['GO:0003674'])])
    const state = { cam: { ...initial, model: buildModel([a]) } }
    const args: string[] = []

    const select = makeSelectModelTerms()
    const first = select(state, args)
    const second = select(state, args)
    expect(second).toBe(first)
  })

  it('returns a fresh selector per factory call', () => {
    const select1 = makeSelectModelTerms()
    const select2 = makeSelectModelTerms()
    expect(select1).not.toBe(select2)
  })
})
