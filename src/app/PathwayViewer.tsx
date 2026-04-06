import { useCallback, useState, useEffect } from 'react'
import type React from 'react'
import { useGetGraphModelQuery } from '@/features/gocam/slices/camApiSlice'
import { useAppDispatch, useAppSelector } from './hooks'
import {
  setModel,
  setSelectedActivity,
  setSelectedConnection,
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
import type { Activity } from '@/features/gocam/models/cam'
import type { ActivityFormType } from '@/features/gocam/models/formModels'
import { resetForm, initCreateForm } from '@/features/gocam/slices/activityFormSlice'
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
import { selectAuthUser, selectBaristaToken } from '@/features/auth/slices/authSlice'
import { usePathwayCanvas } from './hooks/usePathwayCanvas'
import { useDeleteConfirmation } from './hooks/useDeleteConfirmation'

interface ConnectorDialog {
  open: boolean
  source: Activity | null
  target: Activity | null
}

const closedConnector: ConnectorDialog = { open: false, source: null, target: null }

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
  } = useGetGraphModelQuery(
    { modelId: modelId || '', baristaToken: baristaToken || '' },
    { skip: !modelId }
  )

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
      dispatch(
        setSelectedConnection({
          sourceActivityUid: sourceId,
          targetActivityUid: targetId,
        })
      )
      dispatch(setRightPanelTab(RightPanelTab.CONNECTOR_TABLE))
      dispatch(setRightDrawerOpen(true))
    },
    [dispatch]
  )

  const handleLinkCreated = useCallback(
    (sourceId: string, targetId: string) => {
      const source = graphModel?.data?.activities.find(a => a.uid === sourceId)
      const target = graphModel?.data?.activities.find(a => a.uid === targetId)
      if (source && target) {
        setConnector({ open: true, source, target })
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

      {/* Delete confirmation dialog */}
      <Dialog open={del.isDeleteOpen} onClose={del.cancelDelete}>
        <DialogTitle>Confirm Delete?</DialogTitle>
        <DialogContent>Deleting this activity cannot be undone. Continue?</DialogContent>
        <DialogActions>
          <Button onClick={del.cancelDelete}>Cancel</Button>
          <Button onClick={del.confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Connector form dialog */}
      <Dialog
        open={connector.open}
        onClose={() => setConnector(closedConnector)}
        fullWidth
        maxWidth="md"
        PaperProps={{ className: 'rounded-lg' }}
      >
        <DialogTitle className="flex items-center justify-between border-b pb-2">
          <span className="text-lg font-medium">Causal Relation Form</span>
          <IconButton
            edge="end"
            color="inherit"
            onClick={() => setConnector(closedConnector)}
            aria-label="close"
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <div className="p-0">
          {connector.source && connector.target && (
            <ConnectorForm
              sourceActivity={connector.source}
              targetActivity={connector.target}
              onClose={() => setConnector(closedConnector)}
              onSaved={() => setConnector(closedConnector)}
            />
          )}
        </div>
      </Dialog>

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
