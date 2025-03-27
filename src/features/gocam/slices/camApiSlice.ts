import apiService from '@/app/store/apiService'
import { transformGraphData } from '../services/graphServices';
import type { GraphModelApiResponse } from '../models/cam';
import { ENVIRONMENT } from '@/@pango.core/data/constants';

export const addTagTypes = ['graph'] as const

const graphApi = apiService
  .enhanceEndpoints({
    addTagTypes,
  })
  .injectEndpoints({
    endpoints: builder => ({
      getGraphModel: builder.query({
        query: (modelId) => {
          const requests = encodeURIComponent(JSON.stringify([
            {
              entity: 'model',
              operation: 'get',
              arguments: { 'model-id': modelId }
            }
          ]));

          return {
            url: `${ENVIRONMENT.baristaUrl}?token=&intention=query&requests=${requests}`,
          };
        },
        providesTags: ['graph'],
        transformResponse: (response: any): GraphModelApiResponse | null => {
          if (response && response.data) {
            return { data: transformGraphData(response.data) };
          }
          return null;
        },
      }),
    }),
  });

// Export hooks for usage in components
export const { useGetGraphModelQuery } = graphApi;
