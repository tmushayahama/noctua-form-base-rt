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
  term?: GOlrResponse
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
