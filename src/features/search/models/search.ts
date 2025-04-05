import type { Entity, Evidence } from "@/features/gocam/models/cam";

export enum AutocompleteType {
  TERM = 'term',
  REFERENCE = 'reference',
  EVIDENCE_CODE = 'evidence_code',
  WITH = 'with',
  COMMENT = 'comment'
}

export interface GOlrResponse {
  id: string;
  label: string;
  link: string;
  description: string;
  isObsolete: boolean;
  replacedBy: string;
  rootTypes: Entity[];
  xref: string;
  notAnnotatable: boolean;
  neighborhoodGraphJson: string;
}

export interface AnnotationsResponse {
  uid: string;
  term: Entity;
  evidences: Evidence[];
}