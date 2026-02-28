import { Relations } from '@/@noctua.core/models/relations'

const EDGE_COLORS = {
  green: '#2ca02c',
  red: '#d62728',
  grey: '#999999',
  black: '#333333',
} as const

const positiveRelations = new Set([
  Relations.POSITIVELY_REGULATES,
  Relations.DIRECTLY_POSITIVELY_REGULATES,
  Relations.CAUSALLY_UPSTREAM_OF_POSITIVE_EFFECT,
  Relations.IS_SMALL_MOLECULE_ACTIVATOR_OF,
  Relations.INDIRECTLY_POSITIVELY_REGULATES,
])

const negativeRelations = new Set([
  Relations.NEGATIVELY_REGULATES,
  Relations.DIRECTLY_NEGATIVELY_REGULATES,
  Relations.CAUSALLY_UPSTREAM_OF_NEGATIVE_EFFECT,
  Relations.IS_SMALL_MOLECULE_INHIBITOR_OF,
  Relations.INDIRECTLY_NEGATIVELY_REGULATES,
])

const neutralRelations = new Set([
  Relations.CONSTITUTIVELY_UPSTREAM_OF,
  Relations.PROVIDES_INPUT_FOR,
  Relations.REMOVES_INPUT_FOR,
])

export function getEdgeColor(relationId: string): string {
  if (positiveRelations.has(relationId as Relations)) return EDGE_COLORS.green
  if (negativeRelations.has(relationId as Relations)) return EDGE_COLORS.red
  if (neutralRelations.has(relationId as Relations)) return EDGE_COLORS.grey
  return EDGE_COLORS.black
}

export { EDGE_COLORS }
