


export interface Group {
  url: string;
  name: string;
}

export interface Contributor {
  orcid: string;
  name?: string;
  initials?: string;
  color?: string;
  token?: string;
  frequency?: number;
  groups?: Group[];
}

