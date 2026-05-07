import { ENVIRONMENT } from '@/@noctua.core/data/constants'
import type { AnnotationsResponse, GOlrResponse } from '../models/search'
import apiService from '@/app/store/apiService'
import {
  escapeGOlrValue,
  mapGOlrResponse,
  processAnnotationsResponse,
  processHasParticipants,
} from '../services/lookupServices'
import type { Aspect } from '@/features/gocam/models/cam'

function createJsonpScript(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random())
    const jsonpUrl = `${url}${url.includes('?') ? '&' : '?'}json.wrf=${callbackName}`

    const script = document.createElement('script')
    script.src = jsonpUrl
    script.async = true
    script.type = 'text/javascript'

    window[callbackName as any] = function (data: any) {
      document.body.removeChild(script)
      delete window[callbackName as any]
      resolve(data)
    }

    script.onerror = function () {
      document.body.removeChild(script)
      delete window[callbackName as any]
      reject(new Error('JSONP request failed'))
    }

    document.body.appendChild(script)
  })
}

const addTagTypes = ['search'] as const

const lookupApi = apiService
  .enhanceEndpoints({
    addTagTypes,
  })
  .injectEndpoints({
    endpoints: builder => ({
      searchTerms: builder.query<GOlrResponse[], { searchText: string; closureIds: string[] }>({
        queryFn: async ({ searchText, closureIds }) => {
          try {
            const escapedQuery = escapeGOlrValue(searchText)

            const closureFilter =
              closureIds && closureIds.length > 0
                ? closureIds.map(id => `isa_closure:"${id}"`).join(' OR ')
                : null

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
              fq: ['document_category:"ontology_class"', ...(closureFilter ? [closureFilter] : [])],
              qf: [
                'annotation_class^3',
                'annotation_class_label_searchable^5.5',
                'description_searchable^1',
                'synonym_searchable^1',
                'isa_closure_label_searchable^1',
              ],
            }

            const params = new URLSearchParams()

            for (const [key, value] of Object.entries(requestParams)) {
              if (Array.isArray(value)) {
                value.forEach(v => params.append(key, v))
              } else {
                params.append(key, value)
              }
            }

            const url = `${ENVIRONMENT.globalGolrNeoServer}select?${params.toString()}`

            const response = await createJsonpScript(url)

            return {
              data: mapGOlrResponse(response),
            }
          } catch (error) {
            return {
              error: { status: 'CUSTOM_ERROR', error: error?.message },
            }
          }
        },
      }),
      getChemicalParticipants: builder.query<Array<{ id: string; label: string }>, string>({
        queryFn: async termId => {
          try {
            const requestParams = {
              q: termId,
              defType: 'edismax',
              indent: 'on',
              qt: 'standard',
              wt: 'json',
              rows: '2',
              start: '0',
              fl: '*,score',
              facet: 'true',
              'facet.mincount': '1',
              'facet.sort': 'count',
              'facet.limit': '25',
              'json.nl': 'arrarr',
              packet: '1',
              callback_type: 'search',
              fq: ['document_category:"ontology_class"'],
              qf: ['annotation_class^3', 'isa_closure^1'],
            }

            const params = new URLSearchParams()
            for (const [key, value] of Object.entries(requestParams)) {
              if (Array.isArray(value)) {
                value.forEach(v => params.append(key, v))
              } else {
                params.append(key, value)
              }
            }

            const url = `${ENVIRONMENT.globalGolrNeoServer}select?${params.toString()}`
            const response = await createJsonpScript(url)
            const results = mapGOlrResponse(response)

            if (results.length > 0 && results[0].neighborhoodGraphJson) {
              return { data: processHasParticipants(results[0].neighborhoodGraphJson) }
            }

            return { data: [] }
          } catch (error) {
            return {
              error: { status: 'CUSTOM_ERROR', error: (error as Error)?.message },
            }
          }
        },
      }),

      searchAnnotations: builder.query<
        AnnotationsResponse[],
        { gpId: string; aspect: Aspect; term?: string; evidence?: string }
      >({
        queryFn: async ({ gpId, aspect, term, evidence }) => {
          try {
            const fqFilters: string[] = [
              'document_category: "annotation"',
              '-qualifier:"not"',
              `bioentity: "${gpId}"`,
            ]

            if (aspect === 'C') {
              fqFilters.push('isa_partof_closure:"GO:0005575"')
              fqFilters.push('-isa_partof_closure:"GO:0032991"')
            } else {
              fqFilters.push(`aspect: "${aspect}"`)
            }

            if (term) {
              fqFilters.push(`annotation_class:"${term}"`)
            }

            if (evidence) {
              fqFilters.push(`evidence:"${evidence}"`)
            }

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
              fq: fqFilters,
              'facet.field': [
                'source',
                'assigned_by',
                'aspect',
                'evidence_type_closure',
                'isa_partof_closure_label',
                'annotation_class_label',
              ],
              q: '*:*',
            }

            const params = new URLSearchParams()
            for (const [key, value] of Object.entries(requestParams)) {
              if (Array.isArray(value)) {
                value.forEach(v => params.append(key, v))
              } else {
                params.append(key, value as string)
              }
            }

            const url = `${ENVIRONMENT.globalGolrServer}select?${params.toString()}`
            const response = await createJsonpScript(url)

            return {
              data: processAnnotationsResponse(response),
            }
          } catch (error) {
            return {
              error: { status: 'CUSTOM_ERROR', error: error?.message },
            }
          }
        },
      }),

      getPubmedInfo: builder.query<
        { title: string; authors: string; date: string } | null,
        string
      >({
        queryFn: async pmid => {
          try {
            const url = `${ENVIRONMENT.pubmedApiUrl}?format=csl&id=${encodeURIComponent(pmid)}`
            const res = await fetch(url)
            if (!res.ok) return { data: null }
            const data = await res.json()
            const title = data.title || ''
            const authors =
              data.author
                ?.map((a: { family?: string; given?: string }) =>
                  [a.given, a.family].filter(Boolean).join(' ')
                )
                .join(', ') || ''
            const issued = data.issued?.['date-parts']?.[0]
            const date = issued ? issued.join('-') : ''
            return { data: { title, authors, date } }
          } catch {
            return { data: null }
          }
        },
      }),
    }),
  })

export const {
  useSearchTermsQuery,
  useSearchAnnotationsQuery,
  useLazyGetChemicalParticipantsQuery,
  useLazyGetPubmedInfoQuery,
} = lookupApi
