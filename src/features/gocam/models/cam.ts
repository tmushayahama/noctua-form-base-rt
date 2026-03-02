import type { GOlrResponse } from "@/features/search/models/search";
import type { Group, Contributor } from "@/features/users/models/contributor";
import { v4 as uuidv4 } from 'uuid';



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
  CELL_TYPE_ENTITY = 'CL:0000003',
  ANATOMICAL_ENTITY = 'CARO:0000000',
  ORGANISM = 'NCBITaxon',
  BIOLOGICAL_PHASE = 'GO:0044848',
  UBERON_STAGE = 'UBERON:0000105',
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
  contributors: Contributor[];
  date?: string;
  groups: Group[];
  source?: string;
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
}

export interface GraphModel {
  id: string;
  nodes: GraphNode[];
  edges: Edge[];
  activities: Activity[];
  activityConnections: Edge[];
  conformsToGPAD?: boolean;
  state?: string;
  comments?: string[];
  contributors: Contributor[];
  date?: string;
  title?: string;
  groups: Group[];
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

export const createEmptyEvidence = (): EvidenceForm => ({
  uuid: uuidv4(),
  evidenceCode: { id: '', label: '' },
  reference: '',
  withFrom: '',
})

export interface TreeNode {
  uid: string;
  nodeType?: NodeType;
  term?: GOlrResponse
  aspect?: string;
  relation?: Entity
  parentId: string | null;
  isComplement?: boolean;
  evidences: EvidenceForm[];
  rootTypes: Entity[];
  children: TreeNode[];
}

export interface ShexShape {
  subject: string;
  predicate: string;
  object: string[];
  exclude_from_extensions?: boolean;
}

// Root term constants for "Fill with root term" action
export const ROOT_TERMS: Record<string, { id: string; label: string }> = {
  F: { id: 'GO:0003674', label: 'molecular_function' },
  P: { id: 'GO:0008150', label: 'biological_process' },
  C: { id: 'GO:0005575', label: 'cellular_component' },
}

export const EVIDENCE_ND = {
  evidence: { id: 'ECO:0000307', label: 'no biological data found used in manual assertion' },
  reference: 'GO_REF:0000015',
}

export const EVIDENCE_ISS = {
  evidence: { id: 'ECO:0000250', label: 'sequence similarity evidence used in manual assertion' },
  reference: 'GO_REF:0000024',
}

export const BP_ONLY_EDGES = [
  { id: 'RO:0002418', label: 'causally upstream of or within' },
  { id: 'RO:0002411', label: 'causally upstream of' },
  { id: 'RO:0002304', label: 'causally upstream of, positive effect' },
  { id: 'RO:0002305', label: 'causally upstream of, negative effect' },
  { id: 'RO:0004047', label: 'causally upstream of or within, positive effect' },
  { id: 'RO:0004046', label: 'causally upstream of or within, negative effect' },
]
