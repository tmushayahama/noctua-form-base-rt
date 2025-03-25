import apiService from '@/app/store/apiService'
import { transformGraphData } from '../services/graphServices';

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
            url: `http://localhost:3400/api/minerva_local/m3Batch?token=&intention=query&requests=${requests}`,
          };
        },
        providesTags: ['graph'],
        transformResponse: (response: any) => {
          console.log(response.data);
          if (response && response.data) {
            return transformGraphData(response.data);
          }
          return { id: '', nodes: [], edges: [] };
        },
      }),
    }),
  });

// Export hooks for usage in components
export const { useGetGraphModelQuery } = graphApi;
