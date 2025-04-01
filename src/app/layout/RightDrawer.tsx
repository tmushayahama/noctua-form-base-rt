import type React from 'react'
import { useAppDispatch, useAppSelector } from '../hooks'
import { setRightDrawerOpen } from '@/@pango.core/components/drawer/drawerSlice'
import Button from '@mui/material/Button'
import type { RootState } from '../store/store'
import { setSelectedActivity } from '@/features/gocam/slices/camSlice'
import ActivityDetails from '@/features/gocam/components/ActivityDetails'

// TODO style left drawer
const RightDrawerContent: React.FC = () => {
  const dispatch = useAppDispatch()
  const activity = useAppSelector((state: RootState) => state.cam.selectedActivity)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center border-b border-gray-200 p-4">
        <span className="text-lg font-medium">Selected Activity</span>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outlined"
            color="primary"
            size="small"
            className="rounded-md"
            onClick={() => {
              dispatch(setRightDrawerOpen(false))
              dispatch(setSelectedActivity(null))
            }}
            aria-label="Close dialog"
          >
            Close
          </Button>
        </div>
      </div>
      {activity && <ActivityDetails activity={activity} />}
    </div>
  )
}

export default RightDrawerContent
