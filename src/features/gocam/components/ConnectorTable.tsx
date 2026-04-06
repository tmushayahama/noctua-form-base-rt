import type React from 'react'
import { IconButton } from '@mui/material'
import { FiX } from 'react-icons/fi'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { setSelectedConnection, selectSelectedConnection } from '../slices/camSlice'
import { setRightDrawerOpen } from '@/@noctua.core/components/drawer/drawerSlice'
import RelationForm from '@/features/relations/components/RelationForm'

const ConnectorTable: React.FC = () => {
  const dispatch = useAppDispatch()
  const selectedConnection = useAppSelector(selectSelectedConnection)

  if (!selectedConnection) return null

  const { sourceActivity, targetActivity, edge } = selectedConnection

  const handleClose = () => {
    dispatch(setSelectedConnection(null))
    dispatch(setRightDrawerOpen(false))
  }

  const handleSaved = () => {
    dispatch(setSelectedConnection(null))
    dispatch(setRightDrawerOpen(false))
  }

  const sourceLabel =
    sourceActivity.enabledBy?.label ?? sourceActivity.molecularFunction?.label ?? 'Activity'
  const targetLabel =
    targetActivity.enabledBy?.label ?? targetActivity.molecularFunction?.label ?? 'Activity'

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-gray-800">Causal Relation Form</div>
        </div>
        <IconButton size="small" onClick={handleClose} title="Close">
          <FiX size={16} />
        </IconButton>
      </div>

      {/* Activity labels */}
      <div className="border-b border-gray-100 px-4 py-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-gray-500">Source:</span>
          <span className="truncate text-gray-800">{sourceLabel}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-gray-500">Target:</span>
          <span className="truncate text-gray-800">{targetLabel}</span>
        </div>
      </div>

      {/* Relation form */}
      <div className="flex-1 overflow-y-auto">
        <RelationForm
          sourceActivity={sourceActivity}
          targetActivity={targetActivity}
          existingEdgeId={edge.id}
          existingSourceUid={edge.sourceId}
          existingTargetUid={edge.targetId}
          onClose={handleClose}
          onSaved={handleSaved}
        />
      </div>
    </div>
  )
}

export default ConnectorTable
