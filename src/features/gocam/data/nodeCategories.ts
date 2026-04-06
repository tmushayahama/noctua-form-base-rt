import { Aspect, RootTypes } from '../models/cam'
import { Relations } from '@/@noctua.core/models/relations'
import { predicate } from './shapeTerms'

interface RelationConstraint {
  predicate: { id: string; label: string }
  range: string[]
  multivalued: boolean
  required: boolean
  excludeFromExtensions: boolean
}

const rel = (
  id: string,
  range: string[],
  opts?: { multivalued?: boolean; required?: boolean; excludeFromExtensions?: boolean }
): RelationConstraint => ({
  predicate: predicate(id),
  range,
  multivalued: opts?.multivalued ?? false,
  required: opts?.required ?? false,
  excludeFromExtensions: opts?.excludeFromExtensions ?? false,
})

// ── Node Categories ─────────────────────────────────────────────────

export const molecularFunction = {
  id: RootTypes.MOLECULAR_FUNCTION,
  label: 'Molecular Function',
  aspect: Aspect.MOLECULAR_FUNCTION as Aspect | null,
  searchClosureIds: [RootTypes.MOLECULAR_FUNCTION],
  enabledBy: rel(Relations.ENABLED_BY, [RootTypes.MOLECULAR_ENTITY, RootTypes.PROTEIN_CONTAINING_COMPLEX], { multivalued: true, excludeFromExtensions: true }),
  partOf: rel(Relations.PART_OF, [RootTypes.BIOLOGICAL_PROCESS], { multivalued: true }),
  occursIn: rel(Relations.OCCURS_IN, [RootTypes.CELLULAR_COMPONENT]),
  hasInput: rel(Relations.HAS_INPUT, [RootTypes.MOLECULAR_ENTITY, RootTypes.PROTEIN_CONTAINING_COMPLEX], { multivalued: true }),
  happensDuring: rel(Relations.HAPPENS_DURING, [RootTypes.BIOLOGICAL_PHASE, RootTypes.UBERON_STAGE, RootTypes.PLANT_STAGE], { multivalued: true }),
  causallyUpstreamOfOrWithin: rel(Relations.CAUSALLY_UPSTREAM_OF_OR_WITHIN, [RootTypes.BIOLOGICAL_PROCESS], { multivalued: true }),
  causallyUpstreamOf: rel(Relations.CAUSALLY_UPSTREAM_OF, [RootTypes.BIOLOGICAL_PROCESS], { multivalued: true }),
  causallyUpstreamOfPositiveEffect: rel(Relations.CAUSALLY_UPSTREAM_OF_POSITIVE_EFFECT, [RootTypes.BIOLOGICAL_PROCESS], { multivalued: true }),
  causallyUpstreamOfNegativeEffect: rel(Relations.CAUSALLY_UPSTREAM_OF_NEGATIVE_EFFECT, [RootTypes.BIOLOGICAL_PROCESS], { multivalued: true }),
  causallyUpstreamOfOrWithinPositiveEffect: rel(Relations.CAUSALLY_UPSTREAM_OF_OR_WITHIN_POSITIVE_EFFECT, [RootTypes.BIOLOGICAL_PROCESS], { multivalued: true }),
  causallyUpstreamOfOrWithinNegativeEffect: rel(Relations.CAUSALLY_UPSTREAM_OF_OR_WITHIN_NEGATIVE_EFFECT, [RootTypes.BIOLOGICAL_PROCESS], { multivalued: true }),
}

export const biologicalProcess = {
  id: RootTypes.BIOLOGICAL_PROCESS,
  label: 'Biological Process',
  aspect: Aspect.BIOLOGICAL_PROCESS as Aspect | null,
  searchClosureIds: [RootTypes.BIOLOGICAL_PROCESS],
  partOf: rel(Relations.PART_OF, [RootTypes.BIOLOGICAL_PROCESS], { multivalued: true }),
}

export const cellularComponent = {
  id: RootTypes.CELLULAR_COMPONENT,
  label: 'Cellular Component',
  aspect: Aspect.CELLULAR_COMPONENT as Aspect | null,
  searchClosureIds: [RootTypes.CELLULAR_COMPONENT],
  partOf: rel(Relations.PART_OF, [RootTypes.ANATOMICAL_ENTITY, RootTypes.ORGANISM]),
}

export const molecularEntity = {
  id: RootTypes.MOLECULAR_ENTITY,
  label: 'Gene Product',
  aspect: null as Aspect | null,
  searchClosureIds: [RootTypes.MOLECULAR_ENTITY],
  partOf: rel(Relations.PART_OF, [RootTypes.PROTEIN_CONTAINING_COMPLEX], { multivalued: true }),
}

export const chemicalEntity = {
  id: RootTypes.CHEMICAL_ENTITY,
  label: 'Chemical',
  aspect: null as Aspect | null,
  searchClosureIds: [RootTypes.CHEMICAL_ENTITY],
  locatedIn: rel(Relations.LOCATED_IN, [RootTypes.CELLULAR_COMPONENT]),
}

export const proteinContainingComplex = {
  id: RootTypes.PROTEIN_CONTAINING_COMPLEX,
  label: 'Protein Complex',
  aspect: null as Aspect | null,
  searchClosureIds: [RootTypes.PROTEIN_CONTAINING_COMPLEX],
  hasPart: rel(Relations.HAS_PART, [RootTypes.MOLECULAR_ENTITY], { multivalued: true }),
}

export const anatomicalEntity = {
  id: RootTypes.ANATOMICAL_ENTITY,
  label: 'Anatomical Entity',
  aspect: null as Aspect | null,
  searchClosureIds: [RootTypes.ANATOMICAL_ENTITY],
  partOf: rel(Relations.PART_OF, [RootTypes.ANATOMICAL_ENTITY, RootTypes.ORGANISM]),
}

export const cellType = {
  id: RootTypes.CELL_TYPE,
  label: 'Cell Type',
  aspect: null as Aspect | null,
  searchClosureIds: [RootTypes.CELL_TYPE],
  partOf: rel(Relations.PART_OF, [RootTypes.ANATOMICAL_ENTITY, RootTypes.ORGANISM]),
}

export const organism = {
  id: RootTypes.ORGANISM,
  label: 'Organism',
  aspect: null as Aspect | null,
  searchClosureIds: [RootTypes.ORGANISM],
}

export const biologicalPhase = {
  id: RootTypes.BIOLOGICAL_PHASE,
  label: 'Biological Phase',
  aspect: null as Aspect | null,
  searchClosureIds: [RootTypes.BIOLOGICAL_PHASE],
}

export const uberonStage = {
  id: RootTypes.UBERON_STAGE,
  label: 'Life Stage',
  aspect: null as Aspect | null,
  searchClosureIds: [RootTypes.UBERON_STAGE],
}

export const plantStage = {
  id: RootTypes.PLANT_STAGE,
  label: 'Plant Stage',
  aspect: null as Aspect | null,
  searchClosureIds: [RootTypes.PLANT_STAGE],
}

// ── Lookup by ID ────────────────────────────────────────────────────

const ALL_CATEGORIES = [
  molecularFunction,
  biologicalProcess,
  cellularComponent,
  molecularEntity,
  chemicalEntity,
  proteinContainingComplex,
  anatomicalEntity,
  cellType,
  organism,
  biologicalPhase,
  uberonStage,
  plantStage,
] as const

type AnyCategory = (typeof ALL_CATEGORIES)[number]

const CATEGORY_BY_ID = new Map<string, AnyCategory>(
  ALL_CATEGORIES.map(c => [c.id, c])
)

export const getNodeCategory = (id: string): AnyCategory | undefined => {
  return CATEGORY_BY_ID.get(id)
}

// ── Helpers ─────────────────────────────────────────────────────────

