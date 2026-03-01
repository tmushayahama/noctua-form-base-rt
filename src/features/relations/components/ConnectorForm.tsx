import type React from 'react'
import RelationForm from './RelationForm'
import type { Activity } from '@/features/gocam/models/cam'

interface ConnectorFormProps {
  sourceActivity: Activity
  targetActivity: Activity
  onClose: () => void
  onSave?: () => void
}

const ConnectorForm: React.FC<ConnectorFormProps> = ({
  sourceActivity,
  targetActivity,
  onClose,
  onSave,
}) => {
  return (
    <div className="flex flex-col">
      <div className="border-b border-[rgba(59,89,152,0.3)] bg-gray-50 px-4 py-2 text-xs">
        <div className="flex gap-1">
          <span className="w-[60px] font-medium text-[#3b5998]">Subject:</span>
          <span>
            {sourceActivity.enabledBy?.label ?? sourceActivity.rootNode?.label ?? 'Unknown'}
          </span>
        </div>
        <div className="flex gap-1">
          <span className="w-[60px] font-medium text-[#3b5998]">Object:</span>
          <span>
            {targetActivity.enabledBy?.label ?? targetActivity.rootNode?.label ?? 'Unknown'}
          </span>
        </div>
      </div>
      <RelationForm
        sourceActivity={sourceActivity}
        targetActivity={targetActivity}
        onClose={onClose}
        onSave={onSave}
      />
    </div>
  )
}

export default ConnectorForm
