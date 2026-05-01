import type React from 'react'
import { useState, useCallback, useMemo } from 'react'
import { usePopover } from '@/@noctua.core/hooks/usePopover'
import { ActionIcon, Button, Modal } from '@mantine/core'
import { resolveModalSize } from '@/@noctua.core/components/dialog/modalSize'
import DialogHeader from '@/@noctua.core/components/dialog/DialogHeader'
import AnchoredMenu, { MenuItem } from '@/@noctua.core/components/menu/AnchoredMenu'
import { FaEllipsisV } from 'react-icons/fa'
import { FiX } from 'react-icons/fi'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { useUserContext } from '@/app/hooks/useUserContext'
import { selectCamModel } from '../slices/camSlice'
import { ActivityType } from '../models/cam'
import type { Activity, Edge, DisplayTreeNode } from '../models/cam'
import { Relations } from '@/@noctua.core/models/relations'
import { setSelectedActivity } from '../slices/camSlice'
import { setRightDrawerOpen } from '@/@noctua.core/components/drawer/drawerSlice'
import { useUpdateGraphModelMutation } from '../slices/camApiSlice'
import { buildDeleteActivityOperations } from '../services/activityOperations'
import ActivityTableNode, {
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
        showEvidence: true,
        showMenu: true,
        showAddButton: false,
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
      edge: enabledByEdge,
      children: gpChildren,
      treeLevel: 1,
      canDelete: false,
      aspect: getAspectFromRootTypes(enabledByEdge.target.rootTypes),
      floatingLabel: enabledByEdge.label || 'enabled by',
      showEvidence: false,
      showMenu: false,
      showAddButton: true,
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
      showEvidence: true,
      showMenu: true,
      showAddButton: false,
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
  const model = useAppSelector(selectCamModel)
  const userContext = useUserContext()
  const [updateGraphModel] = useUpdateGraphModelMutation()

  const headerMenu = usePopover()
  const [confirmDelete, setConfirmDelete] = useState(false)

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


  const gpLabel = activity.type === ActivityType.MOLECULE ? 'Chemical' : 'Gene Product'

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
        <ActionIcon variant="subtle" color="gray" size="md" onClick={e => headerMenu.open(e.currentTarget)}>
          <FaEllipsisV size={14} />
        </ActionIcon>
        <ActionIcon variant="subtle" color="gray" size="md" onClick={handleClose} title="Close">
          <FiX size={16} />
        </ActionIcon>
      </div>

      {/* ── Body — scrollable ── */}
      <div className="flex-1 overflow-y-auto">
        {/* GP Section */}
        {gpTree.length > 0 && (
          <div>
            <div className="noc-section-header h-[30px] bg-[rgba(121,143,184,0.3)] px-3 text-xs font-semibold uppercase leading-[30px] tracking-wide text-gray-600">
              {gpLabel}
            </div>
            <div className="relative px-2 pb-2 pt-3">
              {gpTree.map(treeNode => (
                <ActivityTableNode
                  key={treeNode.node.uid}
                  treeNode={treeNode}
                  modelId={modelId}
                  userContext={userContext}
                  allEdges={activity.edges}
                  gpNodeId={activity.enabledBy?.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* FD Section */}
        <div>
          <div className="noc-section-header h-[30px] bg-[rgba(121,143,184,0.3)] px-3 text-xs font-semibold uppercase leading-[30px] tracking-wide text-gray-600">
            Function Description
          </div>
          <div className="relative px-2 pb-2 pt-3">
            {fdTree.map(treeNode => (
              <ActivityTableNode
                key={treeNode.node.uid}
                treeNode={treeNode}
                modelId={modelId}
                userContext={userContext}
                allEdges={activity.edges}
                gpNodeId={activity.enabledBy?.id}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Header menu ── */}
      <AnchoredMenu
        anchorEl={headerMenu.anchor}
        open={headerMenu.isOpen}
        onClose={headerMenu.close}
      >
        <MenuItem
          onClick={() => {
            setConfirmDelete(true)
            headerMenu.close()
          }}
          className="text-red-600"
        >
          Delete Activity
        </MenuItem>
      </AnchoredMenu>

      {/* ── Delete confirmation ── */}
      <Modal
        opened={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        size={resolveModalSize('sm')}
      >
        <DialogHeader title="Delete Activity" onClose={() => setConfirmDelete(false)} />
        <div className="px-4 py-4 text-sm text-gray-700">
          Are you sure you want to delete this activity? This cannot be undone.
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
          <Button variant="outline" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button onClick={handleDeleteActivity} color="red" variant="filled">
            Delete
          </Button>
        </div>
      </Modal>

    </div>
  )
}

export default ActivityTable
