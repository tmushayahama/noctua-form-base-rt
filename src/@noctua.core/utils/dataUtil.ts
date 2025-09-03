
import termsData from '@/@noctua.core/data/shape-terms.json';
import { globalKnownRelations } from '@/@noctua.core/data/relations';

// Build static maps only once
const termLookupMap = new Map<string, string>(
  termsData.map(term => [term.id, term.label])
);

const relationLabelMap = new Map<string, string>(
  globalKnownRelations.map(rel => [rel.id, rel.label ?? rel.id])
);

export const getTermLabel = (id: string): string =>
  termLookupMap.get(id) ?? 'Unknown Term';

export const getRelationLabel = (id: string): string =>
  relationLabelMap.get(id) ?? 'Unknown Relation';

export { termLookupMap, relationLabelMap };
