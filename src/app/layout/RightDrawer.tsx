import type React from 'react'
import { useAppDispatch, useAppSelector } from '../hooks'
import {
  setRightPanelTab,
  selectRightPanelTab,
  RightPanelTab,
} from '@/@noctua.core/components/drawer/drawerSlice'
import { Button } from '@mantine/core'
import {
  selectSelectedActivity,
  selectCamModel,
} from '@/features/gocam/slices/camSlice'
import ActivityTable from '@/features/gocam/components/ActivityTable'
import CamErrors from '@/features/gocam/components/CamErrors'

const RightDrawerContent: React.FC = () => {
  const dispatch = useAppDispatch()
  const activity = useAppSelector(selectSelectedActivity)
  const model = useAppSelector(selectCamModel)
  const activeTab = useAppSelector(selectRightPanelTab)

  if (activeTab === RightPanelTab.CAM_ERRORS && model) {
    return <CamErrors model={model} />
  }

  if (activity) {
    return <ActivityTable activity={activity} />
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center border-b border-gray-200 p-4">
        <span className="text-lg font-medium">Activity</span>
        <div className="ml-auto">
          {model && (
            <Button
              variant="subtle"
              size="xs"
              className="!text-xs !normal-case"
              onClick={() => dispatch(setRightPanelTab(RightPanelTab.CAM_ERRORS))}
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
