import type React from 'react'
import { useAppDispatch, useAppSelector } from '../hooks'
import {
  setRightDrawerOpen,
  setRightPanelTab,
  selectRightPanelTab,
} from '@/@noctua.core/components/drawer/drawerSlice'
import Button from '@mui/material/Button'
import type { RootState } from '../store/store'
import { setSelectedActivity, setSelectedConnection } from '@/features/gocam/slices/camSlice'
import ActivityTable from '@/features/gocam/components/ActivityTable'
import ConnectorTable from '@/features/gocam/components/ConnectorTable'
import CamErrors from '@/features/gocam/components/CamErrors'

const RightDrawerContent: React.FC = () => {
  const dispatch = useAppDispatch()
  const activity = useAppSelector((state: RootState) => state.cam.selectedActivity)
  const selectedConnection = useAppSelector(
    (state: RootState) => state.cam.selectedConnection
  )
  const model = useAppSelector((state: RootState) => state.cam.model)
  const activeTab = useAppSelector(selectRightPanelTab)

  const handleClose = () => {
    dispatch(setRightDrawerOpen(false))
    dispatch(setSelectedActivity(null))
    dispatch(setSelectedConnection(null))
  }

  // Render based on active tab
  if (activeTab === 'connectorTable' && selectedConnection) {
    return <ConnectorTable />
  }

  if (activeTab === 'camErrors' && model) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center border-b border-gray-200 p-4">
          <span className="text-lg font-medium">CAM Errors</span>
          <div className="ml-auto flex gap-2">
            {activity && (
              <Button
                variant="text"
                size="small"
                className="!text-xs !normal-case"
                onClick={() => dispatch(setRightPanelTab('activityTable'))}
              >
                Activity
              </Button>
            )}
            <Button
              variant="outlined"
              color="primary"
              size="small"
              onClick={handleClose}
            >
              Close
            </Button>
          </div>
        </div>
        <CamErrors model={model} />
      </div>
    )
  }

  // Default: activity table
  if (activity) {
    return <ActivityTable activity={activity} />
  }

  // Nothing selected
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center border-b border-gray-200 p-4">
        <span className="text-lg font-medium">Activity</span>
        <div className="ml-auto">
          {model && (
            <Button
              variant="text"
              size="small"
              className="!text-xs !normal-case"
              onClick={() => dispatch(setRightPanelTab('camErrors'))}
            >
              Errors
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
        Select an activity to view details
      </div>
    </div>
  )
}

export default RightDrawerContent
