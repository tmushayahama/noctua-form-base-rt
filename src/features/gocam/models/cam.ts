import type { GOlrResponse } from "@/features/search/models/search";
import type { Group, Contributor } from "@/features/users/models/contributor";



export enum ActivityType {
  ACTIVITY = 'activity',
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
  source: GraphNode;
  target: GraphNode;
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
  uid: string;
  nodeType?: NodeType;
  term?: GOlrResponse
  aspect?: string;
  relation?: Entity
  parentId: string | null;
  evidence?: EvidenceForm;
  rootTypes: Entity[];
  children: TreeNode[];
}

export interface ShexShape {
  subject: string;
  predicate: string;
  object: string[];
  exclude_from_extensions?: boolean;
}
