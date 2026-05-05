import { useCallback, useState, useEffect } from 'react'
import type React from 'react'
import { useGetGraphModelQuery } from '@/features/gocam/slices/camApiSlice'
import { useAppDispatch, useAppSelector } from './hooks'
import {
  setModel,
  setSelectedActivity,
} from '@/features/gocam/slices/camSlice'
import { useSearchParams } from 'react-router-dom'
import PathwayGraph from '@/features/pathway/components/PathwayGraph'
import GraphToolbar from '@/features/pathway/components/GraphToolbar'
import StencilPalette from '@/features/pathway/components/StencilPalette'
import {
  setRightDrawerOpen,
  setRightPanelTab,
  RightPanelTab,
} from '@/@noctua.core/components/drawer/drawerSlice'
import type { Activity, Edge } from '@/features/gocam/models/cam'
import type { ActivityFormType } from '@/features/gocam/models/formModels'
import { resetForm, initCreateForm } from '@/features/gocam/slices/activityFormSlice'
import { Button, Modal } from '@mantine/core'
import { resolveModalSize } from '@/@noctua.core/components/dialog/modalSize'
import DialogHeader from '@/@noctua.core/components/dialog/DialogHeader'
import ActivityDialog from '@/features/gocam/components/dialogs/ActivityFormDialog'
import ActivityForm from '@/features/gocam/components/forms/ActivityForm'
import ConnectorForm from '@/features/relations/components/ConnectorForm'
import { selectAuthUser, selectBaristaToken } from '@/features/auth/slices/authSlice'
import { usePathwayCanvas } from './hooks/usePathwayCanvas'
import { useDeleteConfirmation } from './hooks/useDeleteConfirmation'
import { useBaristaModelWatch } from './hooks/useBaristaModelWatch'

interface ConnectorDialog {
  open: boolean
  source: Activity | null
  target: Activity | null
  edge: Edge | null
}

const closedConnector: ConnectorDialog = {
  open: false,
  source: null,
  target: null,
  edge: null,
}

const PathwayEditor: React.FC = () => {
  const dispatch = useAppDispatch()
  const [searchParams] = useSearchParams()
  const modelId = searchParams.get('model_id')

  const user = useAppSelector(selectAuthUser)
  const baristaToken = useAppSelector(selectBaristaToken)
  const isLoggedIn = !!user

  const canvas = usePathwayCanvas(isLoggedIn)
  const [activityFormOpen, setActivityFormOpen] = useState(false)
  const [connector, setConnector] = useState<ConnectorDialog>(closedConnector)

  const {
    data: graphModel,
    error,
    isLoading,
    isSuccess,
    refetch,
  } = useGetGraphModelQuery(
    { modelId: modelId || '', baristaToken: baristaToken || '' },
    { skip: !modelId }
  )

  const { externalChangePending, acknowledge } = useBaristaModelWatch(modelId)

  const handleRefreshModel = useCallback(() => {
    acknowledge()
    refetch()
  }, [acknowledge, refetch])

  const del = useDeleteConfirmation(graphModel?.data ?? null)

  useEffect(() => {
    if (isSuccess && graphModel?.data) {
      dispatch(setModel(graphModel.data))
    }
  }, [graphModel, isSuccess, dispatch])

  // ── Canvas callbacks ──────────────────────────────────────────

  const handleSelectActivity = useCallback(
    (activityId: string) => {
      dispatch(setSelectedActivity(activityId))
      dispatch(setRightPanelTab(RightPanelTab.ACTIVITY_TABLE))
      dispatch(setRightDrawerOpen(true))
    },
    [dispatch]
  )

  const handleLinkClick = useCallback(
    (sourceId: string, targetId: string) => {
      const model = graphModel?.data
      if (!model) return
      const source = model.activities.find(a => a.uid === sourceId)
      const target = model.activities.find(a => a.uid === targetId)
      if (!source || !target) return
      const edge = model.activityConnections.find(
        c =>
          (c.sourceId === source.rootNode?.uid &&
            c.targetId === target.rootNode?.uid) ||
          (c.sourceId === target.rootNode?.uid &&
            c.targetId === source.rootNode?.uid)
      )
      if (!edge) return
      setConnector({ open: true, source, target, edge })
    },
    [graphModel]
  )

  const handleLinkCreated = useCallback(
    (sourceId: string, targetId: string) => {
      const source = graphModel?.data?.activities.find(a => a.uid === sourceId)
      const target = graphModel?.data?.activities.find(a => a.uid === targetId)
      if (source && target) {
        setConnector({ open: true, source, target, edge: null })
      }
    },
    [graphModel]
  )

  const handleStencilDrop = useCallback(
    (type: string, _x: number, _y: number) => {
      dispatch(resetForm())
      dispatch(initCreateForm(type as ActivityFormType))
      setActivityFormOpen(true)
    },
    [dispatch]
  )

  const handleUpdateLocations = useCallback(
    (positions: Record<string, { x: number; y: number }>) => {
      if (!modelId) return
      localStorage.setItem(`activityLocations-${modelId}`, JSON.stringify(positions))
    },
    [modelId]
  )

  if (!modelId) {
    return <div className="p-4">No model ID provided</div>
  }

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      {!isLoggedIn && (
        <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <span className="font-medium">Not Logged In:</span>
          You can only view existing annotations. Log in to edit.
        </div>
      )}

      <GraphToolbar
        layoutDetail={canvas.layoutDetail}
        spacing={canvas.spacing}
        onAutoLayout={canvas.onAutoLayout}
        onLayoutDetailChange={canvas.onLayoutDetailChange}
        onSpacingChange={canvas.onSpacingChange}
        onZoomIn={canvas.onZoomIn}
        onZoomOut={canvas.onZoomOut}
        onZoomReset={canvas.onZoomReset}
      />
      <div className="flex min-h-0 flex-1 flex-row">
        <StencilPalette />
        <div className="relative flex-1">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
              Loading...
            </div>
          )}
          {error && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="p-4 text-red-500">Error loading graph data</div>
            </div>
          )}
          <PathwayGraph
            model={graphModel?.data ?? null}
            layoutDetail={canvas.layoutDetail}
            spacing={canvas.spacing}
            canvasRef={canvas.canvasRef}
            onActivityClick={handleSelectActivity}
            onEditClick={handleSelectActivity}
            onDeleteClick={del.requestDelete}
            onLinkClick={handleLinkClick}
            onLinkCreated={handleLinkCreated}
            onStencilDrop={handleStencilDrop}
            onUpdateLocations={handleUpdateLocations}
          />
        </div>
      </div>

      {/* External update notification */}
      <Modal
        opened={externalChangePending}
        onClose={() => {}}
        withCloseButton={false}
        closeOnClickOutside={false}
        closeOnEscape={false}
        size={resolveModalSize('sm')}
      >
        <div className="flex h-11 shrink-0 items-center border-b border-gray-200 bg-white px-4">
          <span className="text-sm font-semibold text-gray-800">Model Updated</span>
        </div>
        <div className="px-4 py-4 text-sm text-gray-700">
          This model has been modified. Please refresh to get the latest version.
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
          <Button onClick={handleRefreshModel} variant="filled">
            Refresh
          </Button>
        </div>
      </Modal>

      {/* Delete confirmation dialog */}
      <Modal
        opened={del.isDeleteOpen}
        onClose={del.cancelDelete}
        size={resolveModalSize('sm')}
      >
        <DialogHeader title="Confirm Delete?" onClose={del.cancelDelete} />
        <div className="px-4 py-4 text-sm text-gray-700">
          Deleting this activity cannot be undone. Continue?
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
          <Button variant="outline" onClick={del.cancelDelete}>
            Cancel
          </Button>
          <Button onClick={del.confirmDelete} color="red" variant="filled">
            Delete
          </Button>
        </div>
      </Modal>

      {/* Connector form dialog */}
      <Modal
        opened={connector.open}
        onClose={() => setConnector(closedConnector)}
        size={resolveModalSize('md')}
        classNames={{ content: 'overflow-hidden' }}
      >
        <DialogHeader
          title={connector.edge ? 'Edit Causal Relation' : 'Causal Relation Form'}
          onClose={() => setConnector(closedConnector)}
        />
        {connector.source && connector.target && (
          <ConnectorForm
            sourceActivity={connector.source}
            targetActivity={connector.target}
            existingEdgeId={connector.edge?.id}
            existingSourceUid={connector.edge?.sourceId}
            existingTargetUid={connector.edge?.targetId}
            onClose={() => setConnector(closedConnector)}
            onSaved={() => setConnector(closedConnector)}
          />
        )}
      </Modal>

      {/* Activity form dialog */}
      <ActivityDialog
        open={activityFormOpen}
        onClose={() => setActivityFormOpen(false)}
      >
        <ActivityForm
          onSaved={() => setActivityFormOpen(false)}
          onCancel={() => setActivityFormOpen(false)}
        />
      </ActivityDialog>
    </div>
  )
}

export default PathwayEditor
