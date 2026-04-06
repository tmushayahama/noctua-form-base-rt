import type { Entity, Evidence } from '@/features/gocam/models/cam'
import type { Group } from '@/features/users/models/contributor'
import type { GOlrResponse, AnnotationsResponse } from '../models/search'
import { ENVIRONMENT } from '@/@noctua.core/data/constants'

// Helper function to escape special characters in Golr queries
export const escapeGOlrValue = (str: string): string => {
  const pattern: RegExp = /([!*+\-<>=()[\]{}^~?:\\/"|])/g
  return str.replace(pattern, '\\$1')
}

export const mapGOlrResponse = (response: any): GOlrResponse[] => {
  const docs = response.response.docs

  return docs.map((item: any) => {
    let xref
    if (item.database_xref && item.database_xref.length > 0) {
      const xrefDB = item.database_xref[0].split(':')
      xref = xrefDB.length > 1 ? xrefDB[1] : xrefDB[0]
    }

    return {
      id: item.annotation_class,
      label: item.annotation_class_label,
      link: getTermURL(item.annotation_class),
      description: item.description,
      isObsolete: item.is_obsolete,
      replacedBy: item.replaced_by,
      rootTypes: makeEntitiesArray(item.isa_closure, item.isa_closure_label),
      xref: xref,
      neighborhoodGraphJson: item.neighborhood_graph_json,
      notAnnotatable: !item.subset?.includes('gocheck_do_not_annotate'),
    } as GOlrResponse
  })
}

const makeEntitiesArray = (ids: string[] = [], labels: string[] = []): Entity[] => {
  if (!ids || ids.length === 0) return []

  let result: Entity[] = []

  if (!labels || labels.length === 0) {
    result = ids.map(id => ({ id, label: id }) as Entity)
  } else if (ids.length === labels.length) {
    result = ids.map((id, index) => ({ id, label: labels[index] }) as Entity)
  }

  return result.filter(item => !item.id.startsWith('BFO'))
}

export const processAnnotationsResponse = (response: any): AnnotationsResponse[] => {
  const docs = response.response.docs
  const resultMap: Record<string, AnnotationsResponse> = {}

  docs.forEach((doc: any) => {
    const annotationId = doc.annotation_class

    const evidence: Evidence = {
      uid: crypto.randomUUID(),
      evidenceCode: {
        id: doc.evidence,
        label: doc.evidence_label,
      },
      reference: doc.reference?.length > 0 ? doc.reference.join(' | ') : '',
      referenceUrl: '',
      with: doc.evidence_with?.length > 0 ? doc.evidence_with.join(' | ') : '',
      groups: getGroupsFromNames(doc.assigned_by ? [doc.assigned_by] : []),
      contributors: [],
      date: doc.date || '',
    }

    if (doc.annotation_extension_json) {
      try {
        const extJsons = Array.isArray(doc.annotation_extension_json)
          ? doc.annotation_extension_json.map((ext: string) => JSON.parse(ext))
          : [JSON.parse(doc.annotation_extension_json)]

        evidence.evidenceExts = extJsons
          .filter(extJson => extJson.relationship && extJson.relationship.relation)
          .map(extJson => ({
            term: {
              id: extJson.relationship.id,
              label: extJson.relationship.label,
            },
            relations: extJson.relationship.relation.map((relation: any) => ({
              id: relation.id,
              label: relation.label,
            })),
          }))
      } catch (e) {
        console.error('Error parsing annotation extension:', e)
      }
    }

    if (resultMap[annotationId]) {
      resultMap[annotationId].evidences.push(evidence)
    } else {
      resultMap[annotationId] = {
        uid: crypto.randomUUID(),
        term: {
          id: doc.annotation_class,
          label: doc.annotation_class_label,
        },
        evidences: [evidence],
      }
    }
  })

  return Object.values(resultMap)
}

const getGroupsFromNames = (names: string[]): Group[] => {
  return names.map(name => ({
    id: name,
    name: name,
  }))
}

/**
 * Extract chemical participants from a GOlr term's neighborhoodGraphJson.
 * Filters edges by predicate RO:0000057 (has_participant) and returns
 * the target objects as {id, label} pairs.
 */
export const processHasParticipants = (
  neighborhoodGraphJson: string
): Array<{ id: string; label: string }> => {
  try {
    const data = JSON.parse(neighborhoodGraphJson)
    if (!data?.edges || !data?.nodes) return []

    const nodeMap = new Map<string, string>(
      data.nodes.map((node: { id: string; lbl?: string }) => [node.id, node.lbl || ''])
    )

    return data.edges
      .filter((edge: { pred: string }) => edge.pred === 'RO:0000057')
      .map((edge: { obj: string }) => ({
        id: edge.obj,
        label: nodeMap.get(edge.obj) || '',
      }))
  } catch {
    return []
  }
}

function getTermURL(id: string): string {
  if (id.startsWith('ECO')) {
    return ENVIRONMENT.evidenceOntologyUrl + id
  } else if (id.startsWith('PMID')) {
    const idAccession = id.split(':')
    if (idAccession.length > 1) {
      return ENVIRONMENT.pubmedUrl + idAccession[1].trim()
    } else {
      return null
    }
  } else {
    return `${ENVIRONMENT.amigoTermUrl}${id}`
  }
}
