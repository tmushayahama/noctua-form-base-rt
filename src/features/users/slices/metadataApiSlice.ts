import apiService from "@/app/store/apiService";
import { setUsers, setGroups } from "./metadataSlice";
import { ENVIRONMENT } from "@/@noctua.core/data/constants";
import type { Contributor, Group } from "../models/contributor";

export const addTagTypes = ['metadata'] as const;

export const noctuaDataApi = apiService
  .enhanceEndpoints({
    addTagTypes,
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getUserInfo: builder.query<any, string>({
        query: (uri: string) => `/user_info_by_id/${encodeURIComponent(uri)}`,
      }),

      getAllData: builder.query<{
        users: Contributor[];
        groups: Group[];
      }, void>({
        async queryFn(_arg, _queryApi, _extraOptions, fetchWithBQ) {
          try {
            // Fetch all data in parallel
            const [usersResponse, groupsResponse] = await Promise.all([
              fetchWithBQ(`${ENVIRONMENT.globalBaristaLocation}/users`),
              fetchWithBQ(`${ENVIRONMENT.globalBaristaLocation}/groups`),
            ]);

            if (usersResponse.error) return { error: usersResponse.error };
            if (groupsResponse.error) return { error: groupsResponse.error };

            const users: Contributor[] = usersResponse.data.map((item: any) => ({
              name: item.nickname,
              uri: item.uri,
              group: item.group,
              initials: getInitials(item.nickname),
              color: item.color
            }))

            const groups: Group[] = groupsResponse.data.map((item: any) => ({
              name: item.label,
              url: item.id
            }))


            return {
              data: {
                users,
                groups
              }
            };
          } catch (error) {
            return { error: error as Error };
          }
        },
        async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
          try {
            const { data } = await queryFulfilled;
            dispatch(setUsers(data.users));
            dispatch(setGroups(data.groups));
          } catch (error) {
            // Error handling if needed
          }
        }
      })
    }),
    overrideExisting: false,
  });

// Helper functions
function getInitials(string: string): string {
  const names = string.split(' ');
  let initials = names[0].substring(0, 1).toUpperCase();
  if (names.length > 1) {
    initials += names[names.length - 1].substring(0, 1).toUpperCase();
  }
  return initials;
}

export const {
  useGetUserInfoQuery,
  useGetAllDataQuery
} = noctuaDataApi;