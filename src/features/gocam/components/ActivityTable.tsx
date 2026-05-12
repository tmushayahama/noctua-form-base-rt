import type React from 'react'
import { useState, useCallback, useMemo } from 'react'
import { ActionIcon, Button, Menu, Modal, Tooltip } from '@mantine/core'
import { resolveModalSize } from '@/@noctua.core/components/dialog/modalSize'
import DialogHeader from '@/@noctua.core/components/dialog/DialogHeader'
import { FaEllipsisV, FaInfoCircle } from 'react-icons/fa'
import { FiX } from 'react-icons/fi'
import { referenceAllowedDBs, withFromAllowedDBs } from '../data/allowedDatabases'
import AllowedDatabasesPopover from './forms/AllowedDatabasesPopover'
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

  // GP tree — MF is the implicit root (treeLevel 1); GP is one edge deeper.
  const gpTree: DisplayTreeNode[] = []
  if (enabledByEdge?.target) {
    const gpVisited = new Set<string>([activity.rootNode.uid, enabledByEdge.target.uid])
    const gpChildren = buildChildren(enabledByEdge.target.uid, 3, gpVisited)

    gpTree.push({
      node: enabledByEdge.target,
      edge: enabledByEdge,
      children: gpChildren,
      treeLevel: 2,
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

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [refInfoAnchor, setRefInfoAnchor] = useState<HTMLElement | null>(null)
  const [withInfoAnchor, setWithInfoAnchor] = useState<HTMLElement | null>(null)

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
        <Menu shadow="md" position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" size="md">
              <FaEllipsisV size={14} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item color="red" onClick={() => setConfirmDelete(true)}>
              Delete Activity
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
        <ActionIcon variant="subtle" color="gray" size="md" onClick={handleClose} title="Close">
          <FiX size={16} />
        </ActionIcon>
      </div>

      {/* ── Body — scrollable ── */}
      <div className="flex-1 overflow-y-auto bg-white">
        {/* GP Section */}
        {gpTree.length > 0 && (
          <div>
            <div className="flex items-center border-l-4 border-primary-500 bg-primary-50 px-2 py-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary-700">
                {gpLabel}
              </span>
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
          <div className="flex items-center border-l-4 border-primary-500 bg-primary-50 px-2 py-2">
            <span className="grow text-xs font-bold uppercase tracking-wider text-primary-700">
              Function Description
            </span>
            {/* Mirrors EvidenceRow columns: [Evidence (grow)] [ml-1 Ref 100px] [ml-1 With 100px] + 40px action spacer */}
            <div className="ml-1 flex w-[100px] shrink-0 items-center justify-center">
              <Tooltip label="Allowed Reference DBs" position="bottom" withArrow openDelay={300}>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  aria-label="View allowed Reference DBs"
                  onClick={e => setRefInfoAnchor(e.currentTarget)}
                >
                  <FaInfoCircle size={12} />
                </ActionIcon>
              </Tooltip>
            </div>
            <div className="ml-1 flex w-[100px] shrink-0 items-center justify-center">
              <Tooltip label="Allowed With/From DBs" position="bottom" withArrow openDelay={300}>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  aria-label="View allowed With/From DBs"
                  onClick={e => setWithInfoAnchor(e.currentTarget)}
                >
                  <FaInfoCircle size={12} />
                </ActionIcon>
              </Tooltip>
            </div>
            <div className="w-10 shrink-0" aria-hidden="true" />
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

      {/* ── Allowed-database popovers ── */}
      <AllowedDatabasesPopover
        anchorEl={refInfoAnchor}
        onClose={() => setRefInfoAnchor(null)}
        title="Allowed Reference Databases"
        databases={referenceAllowedDBs}
      />
      <AllowedDatabasesPopover
        anchorEl={withInfoAnchor}
        onClose={() => setWithInfoAnchor(null)}
        title="Allowed With/From Databases"
        databases={withFromAllowedDBs}
      />
    </div>
  )
}

export default ActivityTable
