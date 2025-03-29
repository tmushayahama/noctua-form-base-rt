export enum Relations {
  ENABLED_BY = "RO:0002333",
  HAPPENS_DURING = 'RO:0002092',
  LOCATED_IN = 'RO:0001025',
  OCCURS_IN = 'BFO:0000066',
  PART_OF = 'BFO:0000050',
  CAUSALLY_UPSTREAM_OF_POSITIVE_EFFECT = 'RO:0002304',
  CAUSALLY_UPSTREAM_OF_NEGATIVE_EFFECT = 'RO:0002305',
  CONSTITUTIVELY_UPSTREAM_OF = 'RO:0012009',
  DIRECTLY_NEGATIVELY_REGULATES = 'RO:0002630',
  DIRECTLY_POSITIVELY_REGULATES = 'RO:0002629',
  HAS_INPUT = 'RO:0002233',
  HAS_OUTPUT = 'RO:0002234',
  INDIRECTLY_NEGATIVELY_REGULATES = 'RO:0002409',
  INDIRECTLY_POSITIVELY_REGULATES = 'RO:0002407',
  IS_SMALL_MOLECULE_INHIBITOR_OF = 'RO:0012006',
  IS_SMALL_MOLECULE_ACTIVATOR_OF = 'RO:0012005',
  NEGATIVELY_REGULATES = 'RO:0002212',
  POSITIVELY_REGULATES = 'RO:0002213',
  PROVIDES_INPUT_FOR = 'RO:0002413',
  REMOVES_INPUT_FOR = 'RO:0012010',
}

export enum ActivityType {
  DEFAULT = 'default',
  BPONLY = 'bpOnly',
  CCONLY = 'ccOnly',
  MOLECULE = 'molecule',
  PROTEIN_COMPLEX = 'proteinComplex',
}

export enum RootTypes {
  PROTEIN_CONTAINING_COMPLEX = 'GO:0032991',
  CELLULAR_COMPONENT = 'GO:0005575',
  ROOT_CELLULAR_COMPONENT = 'GO:0005575',
  ALL_CELLULAR_COMPONENT = 'GO:0005575',
  CELLULAR_ANATOMICAL = 'GO:0110165',
  BIOLOGICAL_PROCESS = 'GO:0008150',
  MOLECULAR_FUNCTION = 'GO:0003674',
  MOLECULAR_ENTITY = 'CHEBI:33695',
  CHEMICAL_ENTITY = 'CHEBI:24431',
  EVIDENCE = 'ECO:0000352',
  EVIDENCE_NODE = 'ECO:0000000',
  CELL_TYPE_ENTITY = 'CL:0000003',
  ANATOMICAL_ENTITY = 'CARO:0000000',
  ORGANISM = 'NCBITaxon',
  BIOLOGICAL_PHASE = 'GO:0044848',
  UBERON_STAGE = 'UBERON:0000105',
}

export interface Entity {
  id: string;
  label: string;
}


export interface Contributor {
  orcid: string;
  name?: string;
  initials?: string;
  color?: string;
  token?: string;
  frequency: number;
}

export interface Group {
  url: string;
  name: string;
}


export interface Node {
  uid: string;
  id: string;
  label: string;
  rootTypes: string[];
  contributor?: string;
  date?: string;
  group?: string;
  source?: string;
}

export interface Evidence {
  uuid: string;
  evidenceCode: Entity;
  reference: string;
  referenceUrl: string;
  with: string;
  groups: Group[];
  contributors: Contributor[];
  date: string;
}

export interface Edge {
  id: string;
  label: string;
  sourceId: string;
  targetId: string;
  source: Node;
  target: Node;
  evidence?: Evidence[];
  contributor?: string;
  date?: string;
  group?: string;
  isReverseLink?: boolean;
  reverseLinkLabel?: string;
}

export interface Activity {
  uid: string;
  type: ActivityType;
  rootNode: Node;
  molecularFunction: Node | null
  enabledBy: Node | null
  date: string | null;
  nodes: Node[];
  edges: Edge[];
}

export interface GraphModel {
  id: string;
  nodes: Node[];
  edges: Edge[];
  activities: Activity[];
  activityConnections: Edge[];
  conformsToGPAD?: boolean;
  state?: string;
  comments?: string[];
  contributors?: Contributor[];
  date?: string;
  title?: string;
  groups?: Group[];
}

export interface GraphModelApiResponse {
  data: GraphModel;
}

// Activity Form 

export interface EvidenceForm {
  uuid: string;
  evidenceCode: Entity;
  reference: string;
  withFrom: string;
}

export interface TreeNode {
  id: string;
  term?: Entity
  relation?: Entity
  parentId: string | null;
  evidence?: EvidenceForm;
  rootTypes: Entity[];
  children: TreeNode[];
}