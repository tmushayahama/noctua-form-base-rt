import apiService from '@/app/store/apiService';
import { transformGraphData } from '../services/graphServices';
import type { GraphModelApiResponse } from '../models/cam';
import { ENVIRONMENT } from '@/@pango.core/data/constants';
import type { RootState } from '@/app/store/store';

// TODO Cchec if user is there first
export const addTagTypes = ['graph'] as const;

const graphApi = apiService.enhanceEndpoints({ addTagTypes }).injectEndpoints({
  endpoints: builder => ({
    getGraphModel: builder.query<GraphModelApiResponse | null, string>({
      async queryFn(modelId, _queryApi, _extraOptions, baseQuery) {
        const state = _queryApi.getState() as RootState;
        const baristaToken = state.auth.baristaToken || '';
        const user = state.auth.user;

        const requests = encodeURIComponent(JSON.stringify([
          {
            entity: 'model',
            operation: 'get',
            arguments: { 'model-id': modelId },
          },
        ]));

        const result = await baseQuery({
          url: `${ENVIRONMENT.baristaUrl}?token=${baristaToken}&intention=query&requests=${requests}`,
        });

        if (result.error) return { error: result.error };

        return {
          data: result.data && result.data.data
            ? { data: transformGraphData(result.data.data) }
            : null,
        };
      },
      providesTags: ['graph'],
    }),

    updateGraphModel: builder.mutation<GraphModelApiResponse | null, any>({
      async queryFn(requests, _queryApi, _extraOptions, baseQuery) {
        const state = _queryApi.getState() as RootState;
        const baristaToken = state.auth.baristaToken || '';
        const user = state.auth.user;
        const groupId = user?.group?.id || '';

        const bodyParams = new URLSearchParams();
        bodyParams.append('token', baristaToken);
        bodyParams.append('provided-by', groupId);
        bodyParams.append('intention', 'action');
        bodyParams.append('requests', JSON.stringify(requests));

        const result = await baseQuery({
          url: `${ENVIRONMENT.baristaUrl}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          },
          body: bodyParams.toString(), // auto-formats correctly
        });

        if (result.error) return { error: result.error };

        return {
          data: result.data?.data
            ? { data: transformGraphData(result.data.data) }
            : null,
        };
      },
      invalidatesTags: ['graph'],
    }),
  }),
});

export const {
  useGetGraphModelQuery,
  useUpdateGraphModelMutation,
} = graphApi;
