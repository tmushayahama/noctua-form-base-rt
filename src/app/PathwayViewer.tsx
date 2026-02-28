import type React from 'react'
import { useGetGraphModelQuery } from '@/features/gocam/slices/camApiSlice'
import { useEffect } from 'react'
import { useAppDispatch } from './hooks'
import { setModel } from '@/features/gocam/slices/camSlice'
import { useSearchParams } from 'react-router-dom'
import PathwayGraph from '@/features/pathway/components/PathwayGraph'

const PathwayEditor: React.FC = () => {
  const dispatch = useAppDispatch()
  const [searchParams] = useSearchParams()
  const modelId = searchParams.get('model_id')

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

  console.log('Graph model data:', graphModel)

  if (!modelId) {
    return <div className="p-4">No model ID provided</div>
  }

  return (
    <div className="relative h-full min-h-0 flex-1 bg-red-800">
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
      <PathwayGraph model={graphModel?.data ?? null} />
    </div>
  )
}

export default PathwayEditor
