import { Relations } from '@/@noctua.core/models/relations'

const positiveRelations = new Set([
  Relations.POSITIVELY_REGULATES,
  Relations.DIRECTLY_POSITIVELY_REGULATES,
  Relations.CAUSALLY_UPSTREAM_OF_POSITIVE_EFFECT,
  Relations.CAUSALLY_UPSTREAM_OF_OR_WITHIN_POSITIVE_EFFECT,
  Relations.IS_SMALL_MOLECULE_ACTIVATOR_OF,
  Relations.INDIRECTLY_POSITIVELY_REGULATES,
])

const negativeRelations = new Set([
  Relations.NEGATIVELY_REGULATES,
  Relations.DIRECTLY_NEGATIVELY_REGULATES,
  Relations.CAUSALLY_UPSTREAM_OF_NEGATIVE_EFFECT,
  Relations.CAUSALLY_UPSTREAM_OF_OR_WITHIN_NEGATIVE_EFFECT,
  Relations.IS_SMALL_MOLECULE_INHIBITOR_OF,
  Relations.INDIRECTLY_NEGATIVELY_REGULATES,
])

const neutralRelations = new Set([
  Relations.CAUSALLY_UPSTREAM_OF,
  Relations.CAUSALLY_UPSTREAM_OF_OR_WITHIN,
  Relations.CONSTITUTIVELY_UPSTREAM_OF,
  Relations.PROVIDES_INPUT_FOR,
  Relations.REMOVES_INPUT_FOR,
])

/**
 * Returns a color name (not hex) that maps to a Material Design palette.
 * Use with NodeLink.setColor() to get proper hue 600 (line) / 800 (text).
 */
export function getEdgeColor(relationId: string): string {
  if (positiveRelations.has(relationId as Relations)) return 'green'
  if (negativeRelations.has(relationId as Relations)) return 'red'
  if (neutralRelations.has(relationId as Relations)) return 'grey'
  return 'black'
}
