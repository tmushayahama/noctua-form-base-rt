import { useCallback, useRef, useState, useEffect } from 'react'
import type React from 'react'
import {
  useGetGraphModelQuery,
  useUpdateGraphModelMutation,
} from '@/features/gocam/slices/camApiSlice'
import { useAppDispatch, useAppSelector } from './hooks'
import { setModel, setSelectedActivity } from '@/features/gocam/slices/camSlice'
import { useSearchParams } from 'react-router-dom'
import PathwayGraph from '@/features/pathway/components/PathwayGraph'
import GraphToolbar from '@/features/pathway/components/GraphToolbar'
import StencilPalette from '@/features/pathway/components/StencilPalette'
import type { LayoutDetail, LayoutSpacing, CamCanvas } from '@/features/pathway/graph/camCanvas'
import {
  setRightDrawerOpen,
  setRightPanelTab,
} from '@/@noctua.core/components/drawer/drawerSlice'
import type { Activity, ActivityType } from '@/features/gocam/models/cam'
import { resetForm } from '@/features/gocam/slices/activityFormSlice'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import ActivityDialog from '@/features/gocam/components/dialogs/ActivityFormDialog'
import ActivityForm from '@/features/gocam/components/forms/ActivityForm'
import ConnectorForm from '@/features/relations/components/ConnectorForm'
import type { RootState } from './store/store'

const PathwayEditor: React.FC = () => {
  const dispatch = useAppDispatch()
  const [searchParams] = useSearchParams()
  const modelId = searchParams.get('model_id')
  const canvasRef = useRef<CamCanvas | null>(null)

  const [layoutDetail, setLayoutDetail] = useState<LayoutDetail>('detailed')
  const [spacing, setSpacing] = useState<LayoutSpacing>('compact')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [activityFormOpen, setActivityFormOpen] = useState(false)

  // Connector dialog state
  const [connectorFormOpen, setConnectorFormOpen] = useState(false)
  const [connectorSource, setConnectorSource] = useState<Activity | null>(null)
  const [connectorTarget, setConnectorTarget] = useState<Activity | null>(null)

  const user = useAppSelector((state: RootState) => state.auth.user)
  const isLoggedIn = !!user

  const [updateGraphModel] = useUpdateGraphModelMutation()

  const {
    data: graphModel,
    error,
    isLoading,
    isSuccess,
  } = useGetGraphModelQuery(modelId || '', { skip: !modelId })

  useEffect(() => {
    if (isSuccess && graphModel?.data) {
      dispatch(setModel(graphModel.data))
    }
  }, [graphModel, isSuccess, dispatch])

  // Sync readOnly state to canvas
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.readOnly = !isLoggedIn
    }
  }, [isLoggedIn])

  // ── Canvas callbacks ──────────────────────────────────────────

  const handleActivityClick = useCallback(
    (activityId: string) => {
      const activity = graphModel?.data?.activities.find(a => a.uid === activityId)
      if (activity) {
        dispatch(setSelectedActivity(activity))
        dispatch(setRightPanelTab('activityTable'))
        dispatch(setRightDrawerOpen(true))
      }
    },
    [graphModel, dispatch]
  )

  const handleEditClick = useCallback(
    (activityId: string) => {
      const activity = graphModel?.data?.activities.find(a => a.uid === activityId)
      if (activity) {
        dispatch(setSelectedActivity(activity))
        dispatch(setRightPanelTab('activityTable'))
        dispatch(setRightDrawerOpen(true))
      }
    },
    [graphModel, dispatch]
  )

  const handleDeleteClick = useCallback((activityId: string) => {
    setDeleteTarget(activityId)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget || !graphModel?.data) return

    const model = graphModel.data
    const activity = model.activities.find(a => a.uid === deleteTarget)
    if (!activity) return

    // Build minerva requests to remove the activity's facts + individuals
    const requests: Record<string, unknown>[] = []

    // Remove all edges (facts) within the activity
    for (const edge of activity.edges) {
      requests.push({
        entity: 'edge',
        operation: 'remove',
        arguments: {
          'model-id': model.id,
          subject: edge.sourceId,
          object: edge.targetId,
          predicate: edge.id,
        },
      })
    }

    // Remove activity connections involving this activity
    for (const conn of model.activityConnections) {
      if (conn.sourceId === activity.rootNode?.uid || conn.targetId === activity.rootNode?.uid) {
        requests.push({
          entity: 'edge',
          operation: 'remove',
          arguments: {
            'model-id': model.id,
            subject: conn.sourceId,
            object: conn.targetId,
            predicate: conn.id,
          },
        })
      }
    }

    // Remove all nodes (individuals) in the activity
    for (const node of activity.nodes) {
      requests.push({
        entity: 'individual',
        operation: 'remove',
        arguments: {
          'model-id': model.id,
          individual: node.uid,
        },
      })
    }

    // Store model
    requests.push({
      entity: 'model',
      operation: 'store',
      arguments: { 'model-id': model.id },
    })

    updateGraphModel(requests)

    setDeleteTarget(null)
    dispatch(setRightDrawerOpen(false))
    dispatch(setSelectedActivity(null))
  }, [deleteTarget, graphModel, dispatch, updateGraphModel])

  const handleLinkClick = useCallback(
    (sourceId: string, targetId: string) => {
      const source = graphModel?.data?.activities.find(a => a.uid === sourceId)
      const target = graphModel?.data?.activities.find(a => a.uid === targetId)
      if (source && target) {
        setConnectorSource(source)
        setConnectorTarget(target)
        setConnectorFormOpen(true)
      }
    },
    [graphModel]
  )

  const handleLinkCreated = useCallback(
    (sourceId: string, targetId: string) => {
      const source = graphModel?.data?.activities.find(a => a.uid === sourceId)
      const target = graphModel?.data?.activities.find(a => a.uid === targetId)
      if (source && target) {
        setConnectorSource(source)
        setConnectorTarget(target)
        setConnectorFormOpen(true)
      }
    },
    [graphModel]
  )

  const handleCloseConnectorForm = useCallback(() => {
    setConnectorFormOpen(false)
    setConnectorSource(null)
    setConnectorTarget(null)
  }, [])

  const handleStencilDrop = useCallback(
    (_type: ActivityType, _x: number, _y: number) => {
      dispatch(resetForm())
      setActivityFormOpen(true)
    },
    [dispatch]
  )

  const handleCloseActivityForm = useCallback(() => {
    setActivityFormOpen(false)
  }, [])

  // ── Position persistence (Phase 7.1) ──────────────────────────

  const handleUpdateLocations = useCallback(
    (positions: Record<string, { x: number; y: number }>) => {
      if (!modelId) return
      localStorage.setItem(`activityLocations-${modelId}`, JSON.stringify(positions))
    },
    [modelId]
  )

  // ── Toolbar handlers ──────────────────────────────────────────

  const handleAutoLayout = useCallback(() => {
    canvasRef.current?.autoLayout(spacing)
  }, [spacing])

  const handleLayoutDetailChange = useCallback((detail: LayoutDetail) => {
    setLayoutDetail(detail)
  }, [])

  const handleSpacingChange = useCallback((newSpacing: LayoutSpacing) => {
    setSpacing(newSpacing)
    canvasRef.current?.autoLayout(newSpacing)
  }, [])

  const handleZoomIn = useCallback(() => {
    canvasRef.current?.zoom(0.1)
  }, [])

  const handleZoomOut = useCallback(() => {
    canvasRef.current?.zoom(-0.1)
  }, [])

  const handleZoomReset = useCallback(() => {
    canvasRef.current?.resetZoom()
  }, [])

  if (!modelId) {
    return <div className="p-4">No model ID provided</div>
  }

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      {/* Not-logged-in banner (Phase 8.1) */}
      {!isLoggedIn && (
        <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <span className="font-medium">Not Logged In:</span>
          You can only view existing annotations. Log in to edit.
        </div>
      )}

      <GraphToolbar
        layoutDetail={layoutDetail}
        spacing={spacing}
        onAutoLayout={handleAutoLayout}
        onLayoutDetailChange={handleLayoutDetailChange}
        onSpacingChange={handleSpacingChange}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
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
            layoutDetail={layoutDetail}
            spacing={spacing}
            canvasRef={canvasRef}
            onActivityClick={handleActivityClick}
            onEditClick={handleEditClick}
            onDeleteClick={handleDeleteClick}
            onLinkClick={handleLinkClick}
            onLinkCreated={handleLinkCreated}
            onStencilDrop={handleStencilDrop}
            onUpdateLocations={handleUpdateLocations}
          />
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Confirm Delete?</DialogTitle>
        <DialogContent>Deleting this activity cannot be undone. Continue?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Connector form dialog */}
      <Dialog
        open={connectorFormOpen}
        onClose={handleCloseConnectorForm}
        fullWidth
        maxWidth="md"
        PaperProps={{ className: 'rounded-lg' }}
      >
        <DialogTitle className="flex items-center justify-between border-b pb-2">
          <span className="text-lg font-medium">Causal Relation</span>
          <IconButton
            edge="end"
            color="inherit"
            onClick={handleCloseConnectorForm}
            aria-label="close"
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <div className="p-0">
          {connectorSource && connectorTarget && (
            <ConnectorForm
              sourceActivity={connectorSource}
              targetActivity={connectorTarget}
              onClose={handleCloseConnectorForm}
            />
          )}
        </div>
      </Dialog>

      {/* Activity form dialog (Phase 3.3) */}
      <ActivityDialog
        open={activityFormOpen}
        onClose={handleCloseActivityForm}
        title="Add Activity"
      >
        <ActivityForm />
      </ActivityDialog>
    </div>
  )
}

export default PathwayEditor
