import { useCallback, useState } from 'react'
import { useAppDispatch } from '@/app/hooks'
import { useUpdateGraphModelMutation } from '@/features/gocam/slices/camApiSlice'
import { setSelectedActivity } from '@/features/gocam/slices/camSlice'
import { setRightDrawerOpen } from '@/@noctua.core/components/drawer/drawerSlice'
import { buildDeleteActivityOperations } from '@/features/gocam/services/activityOperations'
import type { GraphModel } from '@/features/gocam/models/cam'

export function useDeleteConfirmation(model: GraphModel | null) {
  const dispatch = useAppDispatch()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [updateGraphModel] = useUpdateGraphModelMutation()

  const requestDelete = useCallback((activityId: string) => {
    setDeleteTarget(activityId)
  }, [])

  const confirmDelete = useCallback(() => {
    if (!deleteTarget || !model) return

    const activity = model.activities.find(a => a.uid === deleteTarget)
    if (!activity) return

    const ops = buildDeleteActivityOperations(activity, model.id)
    updateGraphModel(ops)

    setDeleteTarget(null)
    dispatch(setRightDrawerOpen(false))
    dispatch(setSelectedActivity(null))
  }, [deleteTarget, model, dispatch, updateGraphModel])

  const cancelDelete = useCallback(() => {
    setDeleteTarget(null)
  }, [])

  return {
    deleteTarget,
    isDeleteOpen: deleteTarget !== null,
    requestDelete,
    confirmDelete,
    cancelDelete,
  }
}
