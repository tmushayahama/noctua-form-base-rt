import io from 'socket.io-client'

const DEDUP_DELAY_MS = 500

interface RelayEvent {
  class: 'merge' | 'rebuild' | string
  model_id: string
  packet_id?: string
  data?: unknown
}

export interface ModelWatchHandlers {
  onExternalChange: () => void
}

type Unsubscribe = () => void

let socket: SocketIOClient.Socket | null = null
let connectedUrl: string | null = null

const processedPacketIds = new Set<string>()
const watchers = new Map<string, Set<ModelWatchHandlers>>()
const dialogOpenForModel = new Set<string>()

function emitExternalChange(modelId: string) {
  const handlers = watchers.get(modelId)
  if (!handlers || handlers.size === 0) return
  if (dialogOpenForModel.has(modelId)) return
  dialogOpenForModel.add(modelId)
  for (const h of handlers) h.onExternalChange()
}

function handleRelay(event: RelayEvent) {
  if (!event || (event.class !== 'merge' && event.class !== 'rebuild')) return
  if (!event.model_id) return
  if (!watchers.has(event.model_id)) return

  const packetId = event.packet_id
  if (!packetId || packetId === 'unknown') {
    emitExternalChange(event.model_id)
    return
  }

  if (processedPacketIds.has(packetId)) {
    processedPacketIds.delete(packetId)
    return
  }

  setTimeout(() => {
    if (processedPacketIds.has(packetId)) {
      processedPacketIds.delete(packetId)
      return
    }
    emitExternalChange(event.model_id)
  }, DEDUP_DELAY_MS)
}

export const baristaSocketService = {
  connect(baseUrl: string): void {
    if (socket && socket.connected && connectedUrl === baseUrl) return
    if (socket && connectedUrl !== baseUrl) {
      socket.disconnect()
      socket = null
    }
    if (socket) return

    connectedUrl = baseUrl
    socket = io.connect(baseUrl, { transports: ['websocket', 'polling'] })

    socket.on('relay', handleRelay)
  },

  disconnect(): void {
    if (socket) {
      socket.disconnect()
      socket = null
    }
    connectedUrl = null
    watchers.clear()
    dialogOpenForModel.clear()
    processedPacketIds.clear()
  },

  watchModel(modelId: string, handlers: ModelWatchHandlers): Unsubscribe {
    if (!modelId) return () => {}
    let set = watchers.get(modelId)
    if (!set) {
      set = new Set()
      watchers.set(modelId, set)
    }
    set.add(handlers)

    return () => {
      const current = watchers.get(modelId)
      if (!current) return
      current.delete(handlers)
      if (current.size === 0) {
        watchers.delete(modelId)
        dialogOpenForModel.delete(modelId)
      }
    }
  },

  acknowledgeRefresh(modelId: string): void {
    dialogOpenForModel.delete(modelId)
  },

  recordOwnPacket(packetId: string | undefined | null): void {
    if (!packetId || packetId === 'unknown') return
    processedPacketIds.add(packetId)
  },
}
