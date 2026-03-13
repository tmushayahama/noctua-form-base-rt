import type React from 'react'
import { useState, useCallback, useMemo } from 'react'
import {
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material'
import { FaEllipsisV } from 'react-icons/fa'
import { FiX } from 'react-icons/fi'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import type { RootState } from '@/app/store/store'
import type { Activity, Edge, UserContext } from '../models/cam'
import { Relations } from '@/@noctua.core/models/relations'
import { setSelectedActivity } from '../slices/camSlice'
import { setRightDrawerOpen } from '@/@noctua.core/components/drawer/drawerSlice'
import { loadActivity, resetForm } from '../slices/activityFormSlice'
import { useUpdateGraphModelMutation } from '../slices/camApiSlice'
import { buildDeleteActivityOperations } from '../services/activityOperations'
import ActivityForm from './forms/ActivityForm'
import ActivityTableNode, {
  type DisplayTreeNode,
  getAspectFromRootTypes,
} from './ActivityTableNode'

// ── Build display trees from Activity model ─────────────────────────

function buildDisplayTree(activity: Activity): {
  gpTree: DisplayTreeNode[]
  fdTree: DisplayTreeNode[]
} {
  const { edges } = activity

  // Build adjacency: sourceId → child edges
  const childEdgesMap = new Map<string, Edge[]>()
  for (const edge of edges) {
    const list = childEdgesMap.get(edge.sourceId) ?? []
    list.push(edge)
    childEdgesMap.set(edge.sourceId, list)
  }

  function buildChildren(
    parentUid: string,
    level: number,
    visited: Set<string>
  ): DisplayTreeNode[] {
    const childEdges = childEdgesMap.get(parentUid) ?? []
    const result: DisplayTreeNode[] = []

    for (const edge of childEdges) {
      if (visited.has(edge.targetId)) continue
      visited.add(edge.targetId)

      const childNode = edge.target
      if (!childNode) continue

      const aspect = getAspectFromRootTypes(childNode.rootTypes)
      const grandChildren = buildChildren(childNode.uid, level + 1, visited)

      result.push({
        node: childNode,
        edge,
        children: grandChildren,
        treeLevel: level,
        canDelete: true,
        aspect,
        floatingLabel: edge.label || edge.id,
      })
    }

    return result
  }

  // enabled_by edge splits GP tree from FD tree
  const enabledByEdge = edges.find(
    e => e.sourceId === activity.rootNode.uid && e.id === Relations.ENABLED_BY
  )

  // GP tree
  const gpTree: DisplayTreeNode[] = []
  if (enabledByEdge?.target) {
    const gpVisited = new Set<string>([activity.rootNode.uid, enabledByEdge.target.uid])
    const gpChildren = buildChildren(enabledByEdge.target.uid, 2, gpVisited)

    gpTree.push({
      node: enabledByEdge.target,
      edge: null,
      children: gpChildren,
      treeLevel: 1,
      canDelete: false,
      aspect: getAspectFromRootTypes(enabledByEdge.target.rootTypes),
      floatingLabel: enabledByEdge.label || 'enabled by',
    })
  }

  // FD tree
  const fdVisited = new Set<string>([activity.rootNode.uid])
  if (enabledByEdge?.target) fdVisited.add(enabledByEdge.target.uid)

  const fdChildren = buildChildren(activity.rootNode.uid, 2, fdVisited).filter(
    child => child.edge?.id !== Relations.ENABLED_BY
  )

  const fdTree: DisplayTreeNode[] = [
    {
      node: activity.rootNode,
      edge: enabledByEdge ?? null,
      children: fdChildren,
      treeLevel: 1,
      canDelete: false,
      aspect: getAspectFromRootTypes(activity.rootNode.rootTypes),
      floatingLabel: activity.rootNode.label || 'molecular_function',
    },
  ]

  return { gpTree, fdTree }
}

// ── ActivityTable ───────────────────────────────────────────────────

interface ActivityTableProps {
  activity: Activity
}

const ActivityTable: React.FC<ActivityTableProps> = ({ activity }) => {
  const dispatch = useAppDispatch()
  const model = useAppSelector((state: RootState) => state.cam.model)
  const authUser = useAppSelector((state: RootState) => state.auth.user)
  const [updateGraphModel] = useUpdateGraphModelMutation()

  const [headerMenuAnchor, setHeaderMenuAnchor] = useState<HTMLElement | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const userContext: UserContext | undefined = useMemo(() => {
    if (!authUser?.uri || !authUser?.group?.id) return undefined
    return { orcid: authUser.uri, groupUrl: authUser.group.id }
  }, [authUser])

  const modelId = model?.id ?? ''
  const { gpTree, fdTree } = useMemo(() => buildDisplayTree(activity), [activity])

  const handleClose = useCallback(() => {
    dispatch(setSelectedActivity(null))
    dispatch(setRightDrawerOpen(false))
  }, [dispatch])

  const handleDeleteActivity = useCallback(async () => {
    if (!modelId) return
    const ops = buildDeleteActivityOperations(activity, modelId)
    await updateGraphModel(ops)
    setConfirmDelete(false)
    dispatch(setSelectedActivity(null))
    dispatch(setRightDrawerOpen(false))
  }, [activity, modelId, updateGraphModel, dispatch])

  const handleEdit = useCallback(() => {
    dispatch(resetForm())
    dispatch(loadActivity(activity))
    setEditDialogOpen(true)
    setHeaderMenuAnchor(null)
  }, [dispatch, activity])

  const handleEditSaved = useCallback(() => {
    setEditDialogOpen(false)
  }, [])

  const gpLabel = activity.type === 'molecule' ? 'Chemical' : 'Gene Product'

  const activityLabel = activity.enabledBy?.label
    ? activity.enabledBy.label
    : activity.molecularFunction?.label ?? 'Activity'

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-gray-800">{activityLabel}</div>
          {activity.molecularFunction && activity.enabledBy && (
            <div className="truncate text-xs text-gray-500">
              {activity.molecularFunction.label}
            </div>
          )}
        </div>
        <IconButton size="small" onClick={e => setHeaderMenuAnchor(e.currentTarget)}>
          <FaEllipsisV size={14} />
        </IconButton>
        <IconButton size="small" onClick={handleClose} title="Close">
          <FiX size={16} />
        </IconButton>
      </div>

      {/* ── Body — scrollable ── */}
      <div className="flex-1 overflow-y-auto">
        {/* GP Section */}
        {gpTree.length > 0 && (
          <div>
            <div className="noc-section-header px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {gpLabel}
            </div>
            {/* Angular: .noc-tree-container { position: relative; padding: 12px 8px 8px 8px } */}
            <div className="relative px-[8px] pb-[8px] pt-[12px]">
              {gpTree.map(treeNode => (
                <ActivityTableNode
                  key={treeNode.node.uid}
                  treeNode={treeNode}
                  modelId={modelId}
                  userContext={userContext}
                  allEdges={activity.edges}
                />
              ))}
            </div>
          </div>
        )}

        {/* FD Section */}
        <div>
          <div className="noc-section-header px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Function Description
          </div>
          <div className="relative px-[8px] pb-[8px] pt-[12px]">
            {fdTree.map(treeNode => (
              <ActivityTableNode
                key={treeNode.node.uid}
                treeNode={treeNode}
                modelId={modelId}
                userContext={userContext}
                allEdges={activity.edges}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Header menu ── */}
      <Menu
        anchorEl={headerMenuAnchor}
        open={Boolean(headerMenuAnchor)}
        onClose={() => setHeaderMenuAnchor(null)}
      >
        <MenuItem onClick={handleEdit}>Edit Activity</MenuItem>
        <MenuItem
          onClick={() => {
            setConfirmDelete(true)
            setHeaderMenuAnchor(null)
          }}
          className="!text-red-600"
        >
          Delete Activity
        </MenuItem>
      </Menu>

      {/* ── Delete confirmation ── */}
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>Delete Activity</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this activity? This cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button onClick={handleDeleteActivity} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit dialog ── */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        fullWidth
        maxWidth="lg"
        PaperProps={{ className: 'rounded-lg' }}
      >
        <DialogTitle className="flex items-center justify-between border-b pb-2">
          <span className="text-lg font-medium">Edit Activity</span>
          <IconButton size="small" onClick={() => setEditDialogOpen(false)}>
            <FiX />
          </IconButton>
        </DialogTitle>
        <DialogContent className="!p-4">
          <ActivityForm onSaved={handleEditSaved} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ActivityTable
