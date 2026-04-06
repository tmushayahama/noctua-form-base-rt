import type { BaseQueryFn } from '@reduxjs/toolkit/query/react'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

enum ApiVersion {
  V1 = 'noctua-1',
  V2 = 'noctua-2',
}

const LATEST_VERSION = ApiVersion.V1
const VERSION_PARAM = 'apiVersion'

const baseQueryWithVersion: BaseQueryFn = async (args, api, extraOptions) => {
  const searchParams = new URLSearchParams(window.location.search)
  const version = (searchParams.get(VERSION_PARAM) as ApiVersion) || LATEST_VERSION

  const baseQuery = fetchBaseQuery({
    baseUrl: import.meta.env.VITE_NOCTUA_API_URL,
    prepareHeaders: headers => {
      headers.set('Content-Type', 'application/json')
      headers.set('X-API-Version', version)
      return headers
    },
  })

  return baseQuery(args, api, extraOptions)
}

export const apiService = createApi({
  baseQuery: baseQueryWithVersion,
  endpoints: () => ({}),
  reducerPath: 'apiService',
})

export default apiService
