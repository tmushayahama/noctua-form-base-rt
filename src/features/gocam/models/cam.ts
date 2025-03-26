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
}

export interface Activity {
  uid: string;
  molecularFunction: Entity
  enabledBy: Entity
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
  contributor?: Contributor[];
  date?: string;
  title?: string;
  groups?: Group[];
}

