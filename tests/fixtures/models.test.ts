import { describe, it, expect } from 'vitest'
import type { GraphModel } from '@/features/gocam/models/cam'
import {
  swissOneModel,
  anotherModel,
  largeValModel,
} from '@tests/fixtures/models'

const collectRelationIds = (m: GraphModel): Set<string> => {
  const ids = new Set<string>()
  for (const e of m.edges) ids.add(e.id)
  return ids
}

const countEdgesWithEvidence = (m: GraphModel): number =>
  m.edges.reduce((n, e) => n + (e.evidence && e.evidence.length > 0 ? 1 : 0), 0)

interface FixtureCase {
  name: string
  model: GraphModel
  expectedRelations: string[]
}

const cases: FixtureCase[] = [
  {
    name: 'swissOne',
    model: swissOneModel,
    expectedRelations: [
      'BFO:0000050', 'BFO:0000051', 'BFO:0000066', 'RO:0001025',
      'RO:0002233', 'RO:0002234', 'RO:0002333', 'RO:0002629',
      'RO:0002630', 'RO:0012005',
    ],
  },
  {
    name: 'anotherModel',
    model: anotherModel,
    expectedRelations: [
      'BFO:0000050', 'BFO:0000051', 'BFO:0000066', 'RO:0001025',
      'RO:0002233', 'RO:0002234', 'RO:0002304', 'RO:0002333',
      'RO:0002407', 'RO:0002409', 'RO:0002629', 'RO:0002630',
      'RO:0012005', 'RO:0012006',
    ],
  },
  {
    name: 'largeVal',
    model: largeValModel,
    expectedRelations: [
      'BFO:0000050', 'BFO:0000051', 'BFO:0000066', 'RO:0002333',
      'RO:0002409', 'RO:0002413', 'RO:0002629', 'RO:0002630',
      'RO:0012009',
    ],
  },
]

describe.each(cases)('fixture: $name', ({ model, expectedRelations }) => {
  it('has a non-empty id and at least one activity', () => {
    expect(model.id).toBeTruthy()
    expect(model.activities.length).toBeGreaterThan(0)
  })

  it('every activity has a non-null rootNode with uid and id', () => {
    // Note: `label` may be undefined when the Barista response omits it
    // (observed in largeVal for GO:0140378). UI must handle this.
    for (const a of model.activities) {
      expect(a.rootNode).toBeTruthy()
      expect(a.rootNode.uid).toBeTruthy()
      expect(a.rootNode.id).toBeTruthy()
    }
  })

  it('every edge resolves source and target to real nodes', () => {
    for (const e of model.edges) {
      expect(e.source).toBeTruthy()
      expect(e.target).toBeTruthy()
      expect(e.source.uid).toBe(e.sourceId)
      expect(e.target.uid).toBe(e.targetId)
    }
  })

  it('at least one edge carries evidence', () => {
    expect(countEdgesWithEvidence(model)).toBeGreaterThan(0)
  })

  it('all documented relation CURIEs survive the transform', () => {
    const present = collectRelationIds(model)
    for (const rel of expectedRelations) {
      expect(present.has(rel)).toBe(true)
    }
  })

  it('parses model-level state and id', () => {
    expect(model.state).toBeTruthy()
    expect(model.id).toMatch(/^gomodel:/)
  })
})

// Specific anchors — values from the raw JSON, would catch transform regressions.

describe('swissOne specific metadata', () => {
  it('parses the title and taxon from top-level annotations', () => {
    expect(swissOneModel.title).toContain('OPN1MW3')
    expect(swissOneModel.taxon).toBe('NCBITaxon:9606')
  })

  it('parses model-level contributors', () => {
    expect(swissOneModel.contributors.length).toBeGreaterThan(0)
  })
})

describe('relative model sizes', () => {
  it('largeVal has more activities than the other two', () => {
    expect(largeValModel.activities.length).toBeGreaterThan(swissOneModel.activities.length)
    expect(largeValModel.activities.length).toBeGreaterThan(anotherModel.activities.length)
  })
})
