import { ENVIRONMENT } from '@/@pango.core/data/constants'
import type { Node, Edge, Entity, Evidence } from '@/features/gocam/models/cam'
import type { AnnotationsResponse, GOlrResponse } from '../models/search'
import apiService from '@/app/store/apiService'
import type { Group } from '@/features/users/models/contributor';
import { v4 as uuidv4 } from 'uuid';

function createJsonpScript(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    // Create a unique callback name
    const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());

    // Add the callback parameter to the URL
    const jsonpUrl = `${url}${url.includes('?') ? '&' : '?'}json.wrf=${callbackName}`;

    // Create script element
    const script = document.createElement('script');
    script.src = jsonpUrl;
    script.async = true;
    script.type = 'text/javascript';

    // Define the callback function
    window[callbackName as any] = function (data: any) {
      // Clean up
      document.body.removeChild(script);
      delete window[callbackName as any];

      // Resolve the promise with the data
      resolve(data);
    };

    // Handle errors
    script.onerror = function () {
      document.body.removeChild(script);
      delete window[callbackName as any];
      reject(new Error('JSONP request failed'));
    };

    // Add the script to the page
    document.body.appendChild(script);
  });
}


export const addTagTypes = ['search'] as const

const lookupApi = apiService
  .enhanceEndpoints({
    addTagTypes,
  })
  .injectEndpoints({
    endpoints: builder => ({
      searchTerms: builder.query<GOlrResponse[], { searchText: string, closureIds: string[] }>({
        queryFn: async ({ searchText, closureIds }) => {
          try {
            // Format the search query properly
            const escapedQuery = escapeGolrValue(searchText);

            // Build the closure filter if provided
            const closureFilter = closureIds && closureIds.length > 0
              ? closureIds.map(id => `isa_closure:"${id}"`).join(' OR ')
              : null;

            // Build request parameters
            const requestParams = {
              q: escapedQuery + '*',
              defType: 'edismax',
              qt: 'standard',
              indent: 'on',
              wt: 'json',
              rows: '25',
              start: '0',
              fl: '*,score',
              facet: 'true',
              'facet.mincount': '1',
              'facet.sort': 'count',
              'facet.limit': '25',
              'json.nl': 'arrarr',
              fq: [
                'document_category:"ontology_class"',
                ...(closureFilter ? [closureFilter] : [])
              ],
              qf: [
                'annotation_class^3',
                'annotation_class_label_searchable^5.5',
                'description_searchable^1',
                'synonym_searchable^1',
                'isa_closure_label_searchable^1'
              ]
            };

            // Convert parameters to URL format
            const params = new URLSearchParams();

            for (const [key, value] of Object.entries(requestParams)) {
              if (Array.isArray(value)) {
                value.forEach(v => params.append(key, v));
              } else {
                params.append(key, value);
              }
            }

            const url = `${ENVIRONMENT.globalGolrServer}select?${params.toString()}`;

            // Use JSONP to make the request
            const response = await createJsonpScript(url);

            return {
              data: mapGolrResponse(response)
            };
          } catch (error) {
            return {
              error: { status: 'CUSTOM_ERROR', error: error?.message }
            };
          }
        }
      }),
      companionLookup: builder.query<AnnotationsResponse[], { gp: string, aspect: string, term?: string, evidence?: string }>({
        queryFn: async ({ gp, aspect, term, evidence }) => {
          try {
            const requestParams = {
              defType: 'edismax',
              qt: 'standard',
              indent: 'on',
              wt: 'json',
              sort: 'annotation_class_label asc',
              rows: '2000',
              start: '0',
              fl: '*,score',
              facet: 'true',
              'facet.mincount': '1',
              'facet.sort': 'count',
              'json.nl': 'arrarr',
              'facet.limit': '2000',
              fq: [
                'document_category: "annotation"',
                `aspect: "${aspect}"`,
                `bioentity: "${gp}"`
              ],
              'facet.field': [
                'source',
                'assigned_by',
                'aspect',
                'evidence_type_closure',
                'annotation_class_label',
              ],
              q: '*:*',
            };

            if (term) {
              requestParams.fq.push(`annotation_class:"${term}"`);
            }

            if (evidence) {
              requestParams.fq.push(`evidence:"${evidence}"`);
            }

            const params = new URLSearchParams();
            for (const [key, value] of Object.entries(requestParams)) {
              if (Array.isArray(value)) {
                value.forEach(v => params.append(key, v));
              } else {
                params.append(key, value as string);
              }
            }

            const url = `${ENVIRONMENT.globalGolrServer}select?${params.toString()}`;
            const response = await createJsonpScript(url);

            return {
              data: processCompanionResponse(response)
            };
          } catch (error) {
            return {
              error: { status: 'CUSTOM_ERROR', error: error?.message }
            };
          }
        }
      })
    }),
  });

// Helper function to escape special characters in Golr queries
function escapeGolrValue(str: string): string {
  const pattern = /([\!\*\+\-\=\<\>\&\|\(\)\[\]\{\}\^\~\?\:\\/"])/g
  return str.replace(pattern, "\\$1")
}

// Function to map GOlr response to our model
function mapGolrResponse(response: any): GOlrResponse[] {
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
      notAnnotatable: !item.subset?.includes('gocheck_do_not_annotate')
    } as GOlrResponse
  })
}

// Helper function to create entity arrays from ids and labels
function makeEntitiesArray(ids: string[] = [], labels: string[] = []): Entity[] {
  if (!ids || ids.length === 0) return []

  let result: Entity[] = []

  if (!labels || labels.length === 0) {
    result = ids.map(id => ({ id, label: id } as Entity))
  } else if (ids.length === labels.length) {
    result = ids.map((id, index) => ({ id, label: labels[index] } as Entity))
  }

  return result.filter(item => !item.id.startsWith('BFO'))
}




function processCompanionResponse(response: any): AnnotationsResponse[] {
  const docs = response.response.docs;
  const resultMap: Record<string, AnnotationsResponse> = {};

  docs.forEach((doc: any) => {
    const annotationId = doc.annotation_class;

    // Create evidence
    const evidence: Evidence = {
      uuid: crypto.randomUUID(),
      evidenceCode: {
        id: doc.evidence,
        label: doc.evidence_label
      },
      reference: doc.reference?.length > 0 ? doc.reference.join(' | ') : '',
      referenceUrl: '',
      with: doc.evidence_with?.length > 0 ? doc.evidence_with.join(' | ') : '',
      groups: getGroupsFromNames(doc.assigned_by ? [doc.assigned_by] : []),
      contributors: [],
      date: doc.date || ''
    };

    // Process annotation extensions
    if (doc.annotation_extension_json) {
      try {
        const extJsons = Array.isArray(doc.annotation_extension_json)
          ? doc.annotation_extension_json.map((ext: string) => JSON.parse(ext))
          : [JSON.parse(doc.annotation_extension_json)];

        evidence.evidenceExts = extJsons
          .filter(extJson => extJson.relationship && extJson.relationship.relation)
          .map(extJson => ({
            term: {
              id: extJson.relationship.id,
              label: extJson.relationship.label
            },
            relations: extJson.relationship.relation.map((relation: any) => ({
              id: relation.id,
              label: relation.label
            }))
          }));
      } catch (e) {
        console.error('Error parsing annotation extension:', e);
      }
    }

    // Add to existing result or create new one
    if (resultMap[annotationId]) {
      resultMap[annotationId].evidences.push(evidence);
    } else {
      resultMap[annotationId] = {
        uid: crypto.randomUUID(),
        term: {
          id: doc.annotation_class,
          label: doc.annotation_class_label
        },
        evidences: [evidence]
      };
    }
  });

  return Object.values(resultMap);
}

function getGroupsFromNames(names: string[]): Group[] {
  return names.map(name => ({
    id: name,
    name: name
    // Add other required properties from your Group interface
  }));
}

// Function to get term URL
function getTermURL(id: string): string {
  if (id.startsWith('ECO')) {
    return 'http://www.evidenceontology.org/term/' + id
  } else if (id.startsWith('PMID')) {
    const idAccession = id.split(':')
    if (idAccession.length > 1) {
      return 'https://www.ncbi.nlm.nih.gov/pubmed/' + idAccession[1].trim()
    } else {
      return null
    }
  } else {
    return `https://amigo.geneontology.org/amigo/term/${id}`
  }
}

// Export the hook for usage in components
export const { useSearchTermsQuery, useCompanionLookupQuery } = lookupApi

// Export the API for use in store configuration
export default lookupApi