import { useCallback, useRef, useState, useEffect } from 'react'
import type { LayoutDetail, LayoutSpacing, CamCanvas } from '@/features/pathway/graph/camCanvas'

export function usePathwayCanvas(isLoggedIn: boolean) {
  const canvasRef = useRef<CamCanvas | null>(null)
  const [layoutDetail, setLayoutDetail] = useState<LayoutDetail>('detailed')
  const [spacing, setSpacing] = useState<LayoutSpacing>('compact')

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.readOnly = !isLoggedIn
    }
  }, [isLoggedIn])

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

  return {
    canvasRef,
    layoutDetail,
    spacing,
    onAutoLayout: handleAutoLayout,
    onLayoutDetailChange: handleLayoutDetailChange,
    onSpacingChange: handleSpacingChange,
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onZoomReset: handleZoomReset,
  }
}
