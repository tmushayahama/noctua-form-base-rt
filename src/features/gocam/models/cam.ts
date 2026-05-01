import type { Group, Contributor } from "@/features/users/models/contributor";


export enum ActivityType {
  ACTIVITY = 'activity',
  BP_ONLY = 'bpOnly',
  CC_ONLY = 'ccOnly',
  MOLECULE = 'molecule',
  PROTEIN_COMPLEX = 'proteinComplex',
}



export enum RootTypes {
  PROTEIN_CONTAINING_COMPLEX = 'GO:0032991',
  CELLULAR_COMPONENT = 'GO:0005575',
  CELLULAR_ANATOMICAL = 'GO:0110165',
  BIOLOGICAL_PROCESS = 'GO:0008150',
  MOLECULAR_FUNCTION = 'GO:0003674',
  MOLECULAR_ENTITY = 'CHEBI:33695',
  CHEMICAL_ENTITY = 'CHEBI:24431',
  EVIDENCE = 'ECO:0000352',
  EVIDENCE_NODE = 'ECO:0000000',
  CELL_TYPE = 'CL:0000000',
  ANATOMICAL_ENTITY = 'UBERON:0001062',
  ORGANISM = 'NCBITaxon:1',
  BIOLOGICAL_PHASE = 'GO:0044848',
  UBERON_STAGE = 'UBERON:0000105',
  PLANT_STAGE = 'PO:0009012',
}

export enum NodeType {
  MOLECULAR_FUNCTION = RootTypes.MOLECULAR_FUNCTION,
  MOLECULAR_ENTITY = RootTypes.MOLECULAR_ENTITY,
  BIOLOGICAL_PROCESS = RootTypes.BIOLOGICAL_PROCESS,
  CELLULAR_COMPONENT = RootTypes.CELLULAR_COMPONENT,
  CHEMICAL_ENTITY = RootTypes.CHEMICAL_ENTITY,
  PROTEIN_CONTAINING_COMPLEX = RootTypes.PROTEIN_CONTAINING_COMPLEX,
}

export enum Aspect {
  MOLECULAR_FUNCTION = 'F',
  BIOLOGICAL_PROCESS = 'P',
  CELLULAR_COMPONENT = 'C',
}

export interface Entity {
  id: string;
  label: string;
}

export interface GraphNode {
  uid: string;
  id: string;
  label: string;
  rootTypes: string[];
  nodeType?: NodeType
  isComplement: boolean;
  contributors: Contributor[];
  date?: string;
  groups: Group[];
  sources: string[];
  with?: string;
}

export interface Evidence {
  uid: string;
  evidenceCode: Entity;
  reference: string;
  referenceUrl: string;
  with: string;
  groups: Group[];
  contributors: Contributor[];
  date?: string;
}

export interface Edge {
  uid: string;
  id: string;
  label: string;
  sourceId: string;
  targetId: string;
  source: GraphNode;
  target: GraphNode;
  evidence?: Evidence[];
  contributors: Contributor[];
  groups: Group[];
  date?: string;
  isReverseLink?: boolean;
  reverseLinkLabel?: string;
}

export interface Activity {
  uid: string;
  type: ActivityType;
  rootNode: GraphNode;
  molecularFunction: GraphNode | null
  enabledBy: GraphNode | null
  date: string | null;
  nodes: GraphNode[];
  edges: Edge[];
  hasViolations: boolean;
  violations: CamError[];
}

export interface ShExConstraint {
  property: string;
  object?: string;
  cardinality?: number;
  nobjects?: number;
}

export interface ShExViolation {
  node: string;
  shape: string;
  constraints: ShExConstraint[];
}

// ── Validation Error Types ──────────────────────────────────────────

export enum ErrorType {
  CARDINALITY = 'cardinality',
  RELATION = 'relation',
}

export enum ErrorLevel {
  ERROR = 'error',
}

export interface ErrorMeta {
  aspect?: string
  subjectNode?: { label: string }
  edge?: { label: string }
  objectNode?: { label: string }
}

export interface CamError {
  category: ErrorLevel
  type: ErrorType
  message: string
  meta?: ErrorMeta
}

export interface ValidationErrors {
  shexViolations: CamError[]
  orphanedNodes: GraphNode[]
  orphanedEdges: Edge[]
  standaloneNodes: GraphNode[]
  relationNodes: GraphNode[]
  total: number
  hasErrors: boolean
}

export interface GraphModel {
  id: string;
  nodes: GraphNode[];
  edges: Edge[];
  activities: Activity[];
  activityConnections: Edge[];
  conformsToGPAD?: boolean;
  state?: string;
  comments: string[];
  contributors: Contributor[];
  date?: string;
  title?: string;
  groups: Group[];
  modified: boolean;
  taxon?: string;
  violations: ShExViolation[];
  validationErrors: ValidationErrors;
}

export interface GraphModelApiResponse {
  data: GraphModel;
}

export interface UserContext {
  orcid: string;
  groupUrl: string;
}

// ── Display tree (used by ActivityTable / ActivityTableNode) ────────

export interface DisplayTreeNode {
  node: GraphNode
  edge: Edge | null
  children: DisplayTreeNode[]
  treeLevel: number
  canDelete: boolean
  aspect: string | null
  floatingLabel: string
  showEvidence: boolean
  showMenu: boolean
  showAddButton: boolean
}
