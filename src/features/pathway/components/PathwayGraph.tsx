import { useEffect, useRef } from 'react'
import { CamCanvas } from '../graph/camCanvas'
import type { GraphModel } from '@/features/gocam/models/cam'

interface PathwayGraphProps {
  model: GraphModel | null
  onActivityClick?: (activityId: string) => void
}

export default function PathwayGraph({ model, onActivityClick }: PathwayGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<CamCanvas | null>(null)

  // Initialize CamCanvas once the container mounts
  useEffect(() => {
    if (!containerRef.current) return

    const canvas = new CamCanvas(containerRef.current)
    canvas.onActivityClick = onActivityClick
    canvasRef.current = canvas

    return () => {
      canvas.destroy()
      canvasRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-render graph when model changes
  useEffect(() => {
    if (!canvasRef.current || !model) return
    canvasRef.current.addCanvasGraph(model)
  }, [model])

  return <div className="absolute inset-0" ref={containerRef} />
}
