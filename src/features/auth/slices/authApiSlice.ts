import apiService from "@/app/store/apiService";
import { ENVIRONMENT } from "@/@pango.core/data/constants";


export const addTagTypes = ['user'] as const;

export const userApi = apiService
  .enhanceEndpoints({
    addTagTypes,
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getUserInfo: builder.query<any, string>({
        query: (token) => `${ENVIRONMENT.globalBaristaLocation}/user_info_by_token/${token}`,
        providesTags: ['user'],
      }),

    }),
    overrideExisting: false,
  });

export const {
  useGetUserInfoQuery,
} = userApi;