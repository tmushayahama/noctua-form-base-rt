import type { Entity } from '../models/cam'

interface ShapeTermEntry {
  id: string
  label: string
  definition: string
}

/**
 * Build a predicate Entity from an ID by looking up its label.
 * Single source of truth — no hardcoded label strings elsewhere.
 */
export const predicate = (id: string): Entity => ({
  id,
  label: SHAPE_TERM_LABELS[id]?.label ?? id,
})

/**
 * Lookup table for ontology term labels/definitions used in shape constraints.
 * Converted from shape-terms.json.
 */
export const SHAPE_TERM_LABELS: Record<string, ShapeTermEntry> = {
  'CHEBI:33695': {
    id: 'CHEBI:33695',
    label: 'Gene Product',
    definition: '',
  },
  'CHEBI:36080': {
    id: 'CHEBI:36080',
    label: 'protein',
    definition:
      'A biological macromolecule minimally consisting of one polypeptide chain synthesized at the ribosome.',
  },
  'GO:0032991': {
    id: 'GO:0032991',
    label: 'protein complex',
    definition:
      'A stable assembly of two or more macromolecules, i.e. proteins, nucleic acids, carbohydrates or lipids, in which at least one component is a protein and the constituent parts function together.',
  },
  'GO:0005575': {
    id: 'GO:0005575',
    label: 'cellular component',
    definition:
      'A location, relative to cellular compartments and structures, occupied by a macromolecular machine when it carries out a molecular function.',
  },
  'GO:0008150': {
    id: 'GO:0008150',
    label: 'biological process',
    definition:
      'A biological process represents a specific objective that the organism is genetically programmed to achieve.',
  },
  'GO:0003674': {
    id: 'GO:0003674',
    label: 'molecular function',
    definition:
      'A molecular process that can be carried out by the action of a single macromolecular machine, usually via direct physical interactions with other molecular entities.',
  },
  'CHEBI:24431': {
    id: 'CHEBI:24431',
    label: 'chemical',
    definition:
      'A chemical entity is a physical entity of interest in chemistry including molecular entities, parts thereof, and chemical substances.',
  },
  'ECO:0000000': {
    id: 'ECO:0000000',
    label: 'evidence',
    definition: 'A type of information that is used to support an assertion.',
  },
  'UBERON:0001062': {
    id: 'UBERON:0001062',
    label: 'CC/Anatomy/Cell',
    definition: '',
  },
  'CL:0000000': {
    id: 'CL:0000000',
    label: 'cell',
    definition:
      'A cell that is found in a natural setting, which includes multicellular organism cells in vivo and unicellular organisms in environment.',
  },
  'NCBITaxon:1': {
    id: 'NCBITaxon:1',
    label: 'Organism',
    definition: '',
  },
  'GO:0044848': {
    id: 'GO:0044848',
    label: 'biological phase',
    definition: 'A distinct period or stage in a biological process or cycle.',
  },
  'UBERON:0000105': {
    id: 'UBERON:0000105',
    label: 'stage',
    definition:
      'A spatiotemporal region encompassing some part of the life cycle of an organism.',
  },
  'PO:0009012': {
    id: 'PO:0009012',
    label: 'plant stage',
    definition:
      'A stage in the life of a plant structure during which the plant structure undergoes developmental processes.',
  },
  'GO:0034367': {
    id: 'GO:0034367',
    label: 'protein-containing complex remodeling',
    definition:
      'The acquisition, loss, or modification of macromolecules within a complex, resulting in the alteration of an existing complex.',
  },
  // Relation terms
  'BFO:0000050': {
    id: 'BFO:0000050',
    label: 'part of',
    definition: 'a core relation that holds between a part and its whole',
  },
  'BFO:0000051': {
    id: 'BFO:0000051',
    label: 'has part',
    definition: 'a core relation that holds between a whole and its part',
  },
  'BFO:0000066': {
    id: 'BFO:0000066',
    label: 'occurs in',
    definition:
      'a relation between a process and an independent continuant, in which the process takes place entirely within the independent continuant',
  },
  'RO:0002333': {
    id: 'RO:0002333',
    label: 'enabled by',
    definition: 'inverse of enables',
  },
  'RO:0002233': {
    id: 'RO:0002233',
    label: 'has input',
    definition:
      'p has input c iff: p is a process, c is a material entity, c is a participant in p, c is present at the start of p, and the state of c is modified during p.',
  },
  'RO:0002234': {
    id: 'RO:0002234',
    label: 'has output',
    definition:
      'p has output c iff c is a participant in p, c is present at the end of p, and c is not present in the same state at the beginning of p.',
  },
  'RO:0002092': {
    id: 'RO:0002092',
    label: 'happens during',
    definition: '',
  },
  'RO:0001025': {
    id: 'RO:0001025',
    label: 'located in',
    definition:
      'a relation between two independent continuants, the target and the location, in which the target is entirely within the location',
  },
  'RO:0002591': {
    id: 'RO:0002591',
    label: 'results in remodeling of',
    definition: '',
  },
}
