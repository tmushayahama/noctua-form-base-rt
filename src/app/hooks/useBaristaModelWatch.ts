import { useCallback, useEffect, useState } from 'react'
import { baristaSocketService } from '@/features/gocam/services/baristaSocketService'
import { ENVIRONMENT } from '@/@noctua.core/data/constants'

interface UseBaristaModelWatchResult {
  externalChangePending: boolean
  acknowledge: () => void
}

export const useBaristaModelWatch = (
  modelId: string | null
): UseBaristaModelWatchResult => {
  const [externalChangePending, setExternalChangePending] = useState(false)

  useEffect(() => {
    if (!modelId) return
    baristaSocketService.connect(ENVIRONMENT.globalBaristaLocation)
    const unsubscribe = baristaSocketService.watchModel(modelId, {
      onExternalChange: () => setExternalChangePending(true),
    })
    return () => {
      unsubscribe()
      setExternalChangePending(false)
    }
  }, [modelId])

  const acknowledge = useCallback(() => {
    if (modelId) baristaSocketService.acknowledgeRefresh(modelId)
    setExternalChangePending(false)
  }, [modelId])

  return { externalChangePending, acknowledge }
}
