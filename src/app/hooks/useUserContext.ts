import { useMemo } from 'react'
import { useAppSelector } from '@/app/hooks'
import { selectAuthUser } from '@/features/auth/slices/authSlice'
import type { UserContext } from '@/features/gocam/models/cam'

export function useUserContext(): UserContext | undefined {
  const authUser = useAppSelector(selectAuthUser)
  return useMemo(() => {
    if (!authUser?.uri || !authUser?.group?.id) return undefined
    return { orcid: authUser.uri, groupUrl: authUser.group.id }
  }, [authUser])
}
