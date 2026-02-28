import { useCallback, useRef, useState } from 'react'
import type React from 'react'
import { useGetGraphModelQuery } from '@/features/gocam/slices/camApiSlice'
import { useEffect } from 'react'
import { useAppDispatch } from './hooks'
import { setModel, setSelectedActivity } from '@/features/gocam/slices/camSlice'
import { useSearchParams } from 'react-router-dom'
import PathwayGraph from '@/features/pathway/components/PathwayGraph'
import GraphToolbar from '@/features/pathway/components/GraphToolbar'
import type { LayoutDetail, LayoutSpacing, CamCanvas } from '@/features/pathway/graph/camCanvas'
import { setRightDrawerOpen } from '@/@noctua.core/components/drawer/drawerSlice'
import type { ActivityType } from '@/features/gocam/models/cam'

const PathwayEditor: React.FC = () => {
  const dispatch = useAppDispatch()
  const [searchParams] = useSearchParams()
  const modelId = searchParams.get('model_id')
  const canvasRef = useRef<CamCanvas | null>(null)

  const [layoutDetail, setLayoutDetail] = useState<LayoutDetail>('detailed')
  const [spacing, setSpacing] = useState<LayoutSpacing>('compact')

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

  // ── Canvas callbacks ──────────────────────────────────────────

  const handleActivityClick = useCallback(
    (activityId: string) => {
      const activity = graphModel?.data?.activities.find(a => a.uid === activityId)
      if (activity) {
        dispatch(setSelectedActivity(activity))
        dispatch(setRightDrawerOpen(true))
      }
    },
    [graphModel, dispatch]
  )

  const handleLinkClick = useCallback(
    (_sourceId: string, _targetId: string) => {
      // TODO Phase 4: Open connector form in right panel
      dispatch(setRightDrawerOpen(true))
    },
    [dispatch]
  )

  const handleLinkCreated = useCallback((_sourceId: string, _targetId: string) => {
    // TODO Phase 4: Open connector form dialog for new connection
  }, [])

  const handleStencilDrop = useCallback((_type: ActivityType, _x: number, _y: number) => {
    // TODO Phase 3.3: Open ActivityFormDialog with activity type + position
  }, [])

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
          onLinkClick={handleLinkClick}
          onLinkCreated={handleLinkCreated}
          onStencilDrop={handleStencilDrop}
        />
      </div>
    </div>
  )
}

export default PathwayEditor
