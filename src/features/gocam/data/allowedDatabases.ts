/** Placeholder DB prefix for "no database selected" */
export const DB_NONE = 'None'

/** Allowed reference database prefixes for evidence */
export const referenceAllowedDBs = ['PMID', 'DOI', 'GO_REF'] as const

/** Allowed with/from database prefixes */
export const withFromAllowedDBs = [
  'AGI_LocusCode',
  'EcoCyc',
  'FB',
  'GO',
  'MGI',
  'PomBase',
  'PR',
  'RGD',
  'RNAcentral',
  'SGD',
  'UniProtKB',
  'WB',
  'Xenbase',
  'ZFIN',
  'CHEBI',
  'ComplexPortal',
  'EC',
  'InterPro',
  'PANTHER',
  'RHEA',
] as const
