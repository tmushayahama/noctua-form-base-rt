import { useCallback, useEffect, useRef } from 'react'
import { CamCanvas } from '../graph/camCanvas'
import type { LayoutDetail, LayoutSpacing } from '../graph/camCanvas'
import type { GraphModel, ActivityType } from '@/features/gocam/models/cam'

interface PathwayGraphProps {
  model: GraphModel | null
  layoutDetail?: LayoutDetail
  spacing?: LayoutSpacing
  onActivityClick?: (activityId: string) => void
  onEditClick?: (activityId: string) => void
  onDeleteClick?: (activityId: string) => void
  onLinkClick?: (sourceId: string, targetId: string) => void
  onLinkCreated?: (sourceId: string, targetId: string) => void
  onUpdateLocations?: (positions: Record<string, { x: number; y: number }>) => void
  onStencilDrop?: (type: ActivityType, x: number, y: number) => void
  canvasRef?: React.MutableRefObject<CamCanvas | null>
}

export default function PathwayGraph({
  model,
  layoutDetail = 'detailed',
  spacing = 'compact',
  onActivityClick,
  onEditClick,
  onDeleteClick,
  onLinkClick,
  onLinkCreated,
  onUpdateLocations,
  onStencilDrop,
  canvasRef: externalCanvasRef,
}: PathwayGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const internalCanvasRef = useRef<CamCanvas | null>(null)

  const canvasRef = externalCanvasRef ?? internalCanvasRef

  // Initialize CamCanvas once the container mounts
  useEffect(() => {
    if (!containerRef.current) return

    const canvas = new CamCanvas(containerRef.current)
    canvasRef.current = canvas

    return () => {
      canvas.destroy()
      canvasRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep callbacks up to date
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.onActivityClick = onActivityClick
    canvas.onEditClick = onEditClick
    canvas.onDeleteClick = onDeleteClick
    canvas.onLinkClick = onLinkClick
    canvas.onLinkCreated = onLinkCreated
    canvas.onUpdateLocations = onUpdateLocations
    canvas.onStencilDrop = onStencilDrop as CamCanvas['onStencilDrop']
  }, [
    onActivityClick,
    onEditClick,
    onDeleteClick,
    onLinkClick,
    onLinkCreated,
    onUpdateLocations,
    onStencilDrop,
    canvasRef,
  ])

  // Re-render graph when model or layout settings change
  useEffect(() => {
    if (!canvasRef.current || !model) return
    canvasRef.current.addCanvasGraph(model, layoutDetail, spacing)
  }, [model, layoutDetail, spacing, canvasRef])

  // Ctrl+scroll zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        canvasRef.current?.zoom(delta, e.nativeEvent as unknown as MouseEvent)
      }
    },
    [canvasRef]
  )

  return (
    <div
      className="absolute inset-0 overflow-auto select-none"
      ref={containerRef}
      onWheel={handleWheel}
    />
  )
}
