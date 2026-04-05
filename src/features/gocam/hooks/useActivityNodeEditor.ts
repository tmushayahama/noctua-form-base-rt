import { useCallback, useMemo } from 'react'
import type { Evidence, UserContext, Edge } from '../models/cam'
import { AnnotationKey } from '../models/operations'
import { useUpdateGraphModelMutation } from '../slices/camApiSlice'
import { useAppSelector } from '@/app/hooks'
import { selectAuthUser } from '@/features/auth/slices/authSlice'
import {
  buildRemoveEvidenceOperations,
  buildClearEvidenceAnnotationOperations,
  buildDeleteNodeOperations,
} from '../services/activityOperations'

interface UseActivityNodeEditorArgs {
  nodeUid: string
  modelId: string
  userContext?: UserContext
  allEdges: Edge[]
  onNodeDeleted?: () => void
}

export function useActivityNodeEditor({
  nodeUid,
  modelId,
  userContext,
  allEdges,
  onNodeDeleted,
}: UseActivityNodeEditorArgs) {
  const [updateGraphModel] = useUpdateGraphModelMutation()
  const authUser = useAppSelector(selectAuthUser)

  const resolvedUserContext: UserContext | undefined = useMemo(() => {
    if (userContext) return userContext
    if (!authUser?.uri || !authUser?.group?.id) return undefined
    return { orcid: authUser.uri, groupUrl: authUser.group.id }
  }, [userContext, authUser])

  const handleRemoveEvidence = useCallback(
    async (ev: Evidence) => {
      await updateGraphModel(buildRemoveEvidenceOperations(ev.uid, modelId))
    },
    [modelId, updateGraphModel]
  )

  const handleClearField = useCallback(
    async (ev: Evidence, key: AnnotationKey.SOURCE | AnnotationKey.WITH) => {
      const oldValue = key === AnnotationKey.SOURCE ? ev.reference : ev.with
      if (!oldValue) return
      const ops = buildClearEvidenceAnnotationOperations(ev.uid, key, oldValue, modelId, resolvedUserContext)
      if (ops.length > 0) await updateGraphModel(ops)
    },
    [modelId, resolvedUserContext, updateGraphModel]
  )

  const handleDeleteNode = useCallback(async () => {
    const nodeEdges = allEdges
      .filter(e => e.sourceId === nodeUid || e.targetId === nodeUid)
      .map(e => ({ sourceId: e.sourceId, targetId: e.targetId, predicateId: e.id }))
    await updateGraphModel(buildDeleteNodeOperations(nodeUid, nodeEdges, modelId))
    onNodeDeleted?.()
  }, [nodeUid, allEdges, modelId, updateGraphModel, onNodeDeleted])

  return {
    updateGraphModel,
    resolvedUserContext,
    handleRemoveEvidence,
    handleClearField,
    handleDeleteNode,
  }
}
