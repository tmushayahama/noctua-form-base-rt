import { RootTypes } from '../models/cam'

/** Valid model lifecycle states */
export const MODEL_STATES = ['development', 'production', 'review', 'closed', 'delete'] as const

/** Root GO terms by aspect, matching Angular noctuaFormConfig.rootNode */
export const ROOT_NODES: Record<string, { id: string; label: string; aspect: string }> = {
  [RootTypes.MOLECULAR_FUNCTION]: { id: RootTypes.MOLECULAR_FUNCTION, label: 'molecular_function', aspect: 'F' },
  [RootTypes.BIOLOGICAL_PROCESS]: { id: RootTypes.BIOLOGICAL_PROCESS, label: 'biological_process', aspect: 'P' },
  [RootTypes.CELLULAR_COMPONENT]: { id: RootTypes.CELLULAR_COMPONENT, label: 'cellular_component', aspect: 'C' },
}

/** Pre-configured evidence for auto-populate, matching Angular noctuaFormConfig.evidenceAutoPopulate */
export const EVIDENCE_AUTO_POPULATE = {
  nd: {
    evidence: { id: 'ECO:0000307', label: 'no biological data found used in manual assertion' },
    reference: 'GO_REF:0000015',
  },
  iss: {
    evidence: { id: 'ECO:0000250', label: 'sequence similarity evidence used in manual assertion' },
    reference: 'GO_REF:0000024',
  },
}
