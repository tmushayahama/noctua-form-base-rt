import type React from 'react'
import { useState, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import type { Activity, Edge, GraphNode } from '../models/cam'
import { loadActivity, resetForm } from '../slices/activityFormSlice'
import { useUpdateGraphModelMutation } from '../slices/camApiSlice'
import type { RootState } from '@/app/store/store'
import { Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material'
import { FaTrash, FaEdit } from 'react-icons/fa'
import { FiX } from 'react-icons/fi'
import ActivityForm from './forms/ActivityForm'

interface ActivityDetailProps {
  activity: Activity
}

const ActivityRow: React.FC<{
  node: GraphNode
  edge: Edge
  modelId: string
}> = ({ node, edge, modelId }) => {
  const [updateGraphModel] = useUpdateGraphModelMutation()
  const handleDeleteEdge = useCallback(async () => {
    if (!modelId) return
    const ops = [
      {
        entity: 'edge',
        operation: 'remove',
        arguments: {
          'model-id': modelId,
          subject: edge.sourceId,
          object: edge.targetId,
          predicate: edge.id,
        },
      },
      {
        entity: 'individual',
        operation: 'remove',
        arguments: { 'model-id': modelId, individual: node.uid },
      },
      {
        entity: 'model',
        operation: 'store',
        arguments: { 'model-id': modelId },
      },
    ]
    await updateGraphModel(ops)
  }, [edge, node, modelId, updateGraphModel])

  return (
    <div className="flex w-full gap-2">
      {/* Term box */}
      <div className="group relative flex flex-1 flex-col justify-start rounded-lg border border-gray-300 px-2 pt-6 text-sm transition-all duration-200 hover:border-primary-500 hover:shadow-md">
        <div className="absolute -top-1 left-2 bg-white px-2 text-2xs font-bold text-primary-500">
          <span>{edge.label}</span>
        </div>
        <div className="absolute right-1 top-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <button
            className="rounded-full p-1 text-red-500 hover:bg-red-50"
            onClick={handleDeleteEdge}
            title="Delete this node"
          >
            <FaTrash size={12} />
          </button>
        </div>
        <span>
          {node.label} <br />
          <span className="text-xs text-gray-500">{node.id}</span>
        </span>
      </div>

      {/* Evidence boxes */}
      {edge.evidence && edge.evidence.length > 0 ? (
        edge.evidence.map(ev => (
          <div key={ev.uid} className="flex w-[500px] flex-row gap-2">
            <div className="group relative flex-1 rounded-lg border border-gray-300 px-2 pt-6 text-xs transition-all duration-200 hover:border-primary-500 hover:shadow-md">
              <div className="absolute -top-1 left-2 bg-white px-2 text-2xs font-bold text-primary-500">
                Evidence
              </div>
              <span>
                {ev.evidenceCode?.label} <br />
                <span className="text-xs text-gray-500">{ev.evidenceCode?.id}</span>
              </span>
            </div>
            <div className="group relative w-[120px] rounded-lg border border-gray-300 px-2 pt-6 text-xs transition-all duration-200 hover:border-primary-500 hover:shadow-md">
              <div className="absolute -top-1 left-2 bg-white px-2 text-2xs font-bold text-primary-500">
                Reference
              </div>
              <span>
                <a href={ev.referenceUrl} target="_blank" rel="noopener noreferrer">
                  {ev.reference}
                </a>
              </span>
            </div>
            <div className="group relative w-[120px] rounded-lg border border-gray-300 px-2 pt-6 text-xs transition-all duration-200 hover:border-primary-500 hover:shadow-md">
              <div className="absolute -top-1 left-2 bg-white px-2 text-2xs font-bold text-primary-500">
                With
              </div>
              <span>{ev.with}</span>
            </div>
          </div>
        ))
      ) : (
        <div className="group relative flex-1 rounded-lg border border-gray-300 px-2 pt-6 text-xs transition-all duration-200 hover:border-primary-500 hover:shadow-md">
          <div className="absolute -top-1 left-2 bg-white px-2 text-2xs font-bold text-primary-500">
            Evidence
          </div>
          <span className="text-gray-400">No evidence</span>
        </div>
      )}
    </div>
  )
}

const ActivityDetail: React.FC<ActivityDetailProps> = ({ activity }) => {
  const dispatch = useAppDispatch()
  const model = useAppSelector((state: RootState) => state.cam.model)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const handleEdit = useCallback(() => {
    dispatch(resetForm())
    dispatch(loadActivity(activity))
    setEditDialogOpen(true)
  }, [dispatch, activity])

  const handleEditSaved = useCallback(() => {
    setEditDialogOpen(false)
  }, [])

  const handleEditClose = useCallback(() => {
    setEditDialogOpen(false)
    dispatch(resetForm())
  }, [dispatch])

  if (!activity) return null

  const modelId = model?.id || ''

  return (
    <div className="h-full overflow-auto">
      <div className="flex items-center justify-between border-b border-gray-300 p-2">
        <div>
          {activity.enabledBy && (
            <div className="text-sm font-semibold text-gray-700">{activity.enabledBy.label}</div>
          )}
          {activity.molecularFunction && (
            <div className="text-xs text-gray-500">{activity.molecularFunction.label}</div>
          )}
        </div>
        <IconButton size="small" onClick={handleEdit} title="Edit activity">
          <FaEdit size={14} className="text-blue-500" />
        </IconButton>
      </div>

      <div className="flex flex-col gap-2 p-2">
        {activity.edges.map(edge => (
          <ActivityRow key={edge.uid} edge={edge} node={edge.target} modelId={modelId} />
        ))}
      </div>

      {/* Edit Activity Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleEditClose}
        fullWidth
        maxWidth="lg"
        PaperProps={{ className: 'rounded-lg' }}
      >
        <DialogTitle className="flex items-center justify-between border-b pb-2">
          <span className="text-lg font-medium">Edit Activity</span>
          <IconButton size="small" onClick={handleEditClose}>
            <FiX />
          </IconButton>
        </DialogTitle>
        <DialogContent className="!p-4">
          <ActivityForm onSaved={handleEditSaved} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ActivityDetail
