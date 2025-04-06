import { ENVIRONMENT } from '@/@pango.core/data/constants'
import type { AnnotationsResponse, GOlrResponse } from '../models/search'
import apiService from '@/app/store/apiService'
import { escapeGOlrValue, mapGOlrResponse, processAnnotationsResponse } from '../services/lookupServices';
import type { Aspect } from '@/features/gocam/models/cam';

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
            const escapedQuery = escapeGOlrValue(searchText);

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

            const url = `${ENVIRONMENT.globalGolrNeoServer}select?${params.toString()}`;

            // Use JSONP to make the request
            const response = await createJsonpScript(url);

            return {
              data: mapGOlrResponse(response)
            };
          } catch (error) {
            return {
              error: { status: 'CUSTOM_ERROR', error: error?.message }
            };
          }
        }
      }),
      searchAnnotations: builder.query<AnnotationsResponse[], { gpId: string, aspect: Aspect, term?: string, evidence?: string }>({
        queryFn: async ({ gpId, aspect, term, evidence }) => {
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
                `bioentity: "${gpId}"`
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
              data: processAnnotationsResponse(response)
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



export const { useSearchTermsQuery, useSearchAnnotationsQuery } = lookupApi
