import apiService from '@/app/store/apiService'
import { transformGraphData } from '../services/graphServices'
import type { GraphModelApiResponse } from '../models/cam'
import type { RootState } from '@/app/store/store'
import { getBaristaApiUrl } from '@/@noctua.core/services/linksService'
import { AnnotationKey, OperationEntity, OperationType } from '../models/operations'
import type { Operation } from '../models/operations'
import { baristaSocketService } from '../services/baristaSocketService'

const extractPacketId = (raw: unknown): string | undefined => {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const v = r['packet-id'] ?? r['packet_id']
  return typeof v === 'string' ? v : undefined
}

const addTagTypes = ['graph'] as const

interface GraphQueryArg {
  modelId: string
  baristaToken: string
}

const graphApi = apiService.enhanceEndpoints({ addTagTypes }).injectEndpoints({
  endpoints: builder => ({
    getGraphModel: builder.query<GraphModelApiResponse | null, GraphQueryArg>({
      async queryFn({ modelId, baristaToken }, _queryApi, _extraOptions, baseQuery) {
        const baseUrl = getBaristaApiUrl(baristaToken)

        const requests = encodeURIComponent(
          JSON.stringify([
            {
              entity: OperationEntity.MODEL,
              operation: OperationType.GET,
              arguments: { 'model-id': modelId },
            },
          ])
        )

        const result = await baseQuery({
          url: `${baseUrl}?token=${baristaToken}&intention=query&use-reasoner=true&requests=${requests}`,
        })

        if (result.error) return { error: result.error }

        return {
          data:
            result.data && result.data.data
              ? { data: transformGraphData(result.data.data) }
              : null,
        }
      },
      providesTags: (_result, _error, { modelId }) => [{ type: 'graph', id: modelId }],
    }),

    copyGraphModel: builder.mutation<
      { newModelId: string } | null,
      { modelId: string; title: string; preserveEvidence: boolean }
    >({
      async queryFn({ modelId, title, preserveEvidence }, _queryApi, _extraOptions, baseQuery) {
        const state = _queryApi.getState() as RootState
        const baristaToken = state.auth.baristaToken || ''
        const user = state.auth.user
        const groupId = user?.group?.id || ''

        const baseUrl = getBaristaApiUrl(baristaToken)

        const requests = JSON.stringify([
          {
            entity: OperationEntity.MODEL,
            operation: OperationType.COPY,
            arguments: {
              'model-id': modelId,
              'preserve-evidence': preserveEvidence,
              values: [{ key: AnnotationKey.TITLE, value: title }],
            },
          },
        ])

        const bodyParams = new URLSearchParams()
        bodyParams.append('token', baristaToken)
        if (groupId) bodyParams.append('provided-by', groupId)
        bodyParams.append('intention', 'action')
        bodyParams.append('requests', requests)

        const result = await baseQuery({
          url: baseUrl,
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          },
          body: bodyParams.toString(),
        })

        if (result.error) return { error: result.error }

        const newModelId = result.data?.data?.id || null
        return { data: newModelId ? { newModelId } : null }
      },
      invalidatesTags: (_result, _error, { modelId }) => [{ type: 'graph', id: modelId }],
    }),

    updateGraphModel: builder.mutation<GraphModelApiResponse | null, Operation[]>({
      async queryFn(requests, _queryApi, _extraOptions, baseQuery) {
        const state = _queryApi.getState() as RootState
        const baristaToken = state.auth.baristaToken || ''
        const user = state.auth.user
        const groupId = user?.group?.id || ''

        const baseUrl = getBaristaApiUrl(baristaToken)

        const bodyParams = new URLSearchParams()
        bodyParams.append('token', baristaToken)
        bodyParams.append('provided-by', groupId)
        bodyParams.append('intention', 'action')
        bodyParams.append('use-reasoner', 'true')
        bodyParams.append('requests', JSON.stringify(requests))

        const result = await baseQuery({
          url: baseUrl,
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          },
          body: bodyParams.toString(),
        })

        if (result.error) return { error: result.error }

        baristaSocketService.recordOwnPacket(extractPacketId(result.data))

        return {
          data: result.data?.data
            ? { data: transformGraphData(result.data.data) }
            : null,
        }
      },
      invalidatesTags: ['graph'],
    }),
  }),
})

export const {
  useGetGraphModelQuery,
  useUpdateGraphModelMutation,
  useCopyGraphModelMutation,
} = graphApi
