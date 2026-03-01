import type React from 'react'
import { useAppDispatch, useAppSelector } from '../hooks'
import {
  setRightDrawerOpen,
  setRightPanelTab,
  selectRightPanelTab,
} from '@/@noctua.core/components/drawer/drawerSlice'
import Button from '@mui/material/Button'
import type { RootState } from '../store/store'
import { setSelectedActivity } from '@/features/gocam/slices/camSlice'
import ActivityDetails from '@/features/gocam/components/ActivityDetails'
import CamErrors from '@/features/gocam/components/CamErrors'

const RightDrawerContent: React.FC = () => {
  const dispatch = useAppDispatch()
  const activity = useAppSelector((state: RootState) => state.cam.selectedActivity)
  const model = useAppSelector((state: RootState) => state.cam.model)
  const activeTab = useAppSelector(selectRightPanelTab)

  const handleClose = () => {
    dispatch(setRightDrawerOpen(false))
    dispatch(setSelectedActivity(null))
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center border-b border-gray-200 p-4">
        <span className="text-lg font-medium">Selected Activity</span>
        <div className="ml-auto flex gap-2">
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
          <Button
            variant="outlined"
            color="primary"
            size="small"
            className="rounded-md"
            onClick={handleClose}
            aria-label="Close dialog"
          >
            Close
          </Button>
        </div>
      </div>
      {activeTab === 'camErrors' && model ? (
        <CamErrors model={model} />
      ) : (
        activity && <ActivityDetails activity={activity} />
      )}
    </div>
  )
}

export default RightDrawerContent
