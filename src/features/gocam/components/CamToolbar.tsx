import type React from 'react'
import { useMemo } from 'react'
import { ActionIcon, Tooltip } from '@mantine/core'
import {
  FaCalendarDay,
  FaComment,
  FaClone,
  FaExclamationTriangle,
  FaPen,
  FaTasks,
} from 'react-icons/fa'
import { useAppSelector, useAppDispatch } from '@/app/hooks'
import { selectCamModel } from '@/features/gocam/slices/camSlice'
import { selectBaristaToken } from '@/features/auth/slices/authSlice'
import { openDialog, DialogComponent } from '@/@noctua.core/components/dialog/dialogSlice'
import {
  setRightDrawerOpen,
  setRightPanelTab,
  RightPanelTab,
} from '@/@noctua.core/components/drawer/drawerSlice'
import Chip from '@/@noctua.core/components/chip/Chip'
import { useModelUrls } from '../hooks/useModelUrls'
import { getStateColor } from '../data/stateColors'
import ContributorChips from './ContributorChips'
import ToolbarLinkMenu from './ToolbarLinkMenu'

const CamToolbar: React.FC = () => {
  const dispatch = useAppDispatch()
  const cam = useAppSelector(selectCamModel)
  const baristaToken = useAppSelector(selectBaristaToken)
  const urls = useModelUrls(cam?.id, baristaToken)

  const openCamForm = () => {
    dispatch(
      openDialog({
        component: DialogComponent.CAM_METADATA_FORM,
        title: 'Edit Model',
        size: 'cam',
      })
    )
  }

  const openCopyDialog = () => {
    dispatch(
      openDialog({
        component: DialogComponent.COPY_MODEL_DIALOG,
        title: 'Copy Model',
        size: 'cam',
      })
    )
  }

  const totalErrors = cam?.validationErrors.total ?? 0

  const openCamErrors = () => {
    dispatch(setRightPanelTab(RightPanelTab.CAM_ERRORS))
    dispatch(setRightDrawerOpen(true))
  }

  const viewInItems = useMemo(
    () => [
      { label: 'Annotation Preview', href: urls?.annotationPreview },
      { label: 'Pathway Viewer', href: urls?.pathwayViewer },
      { label: 'Graph Editor', href: urls?.graphEditor },
    ],
    [urls]
  )

  const exportItems = useMemo(
    () => [
      { label: 'GPAD', href: urls?.gpad },
      { label: 'OWL', href: urls?.owl },
    ],
    [urls]
  )

  if (!cam) return null

  const commentCount = cam.comments?.length || 0
  const stateColor = getStateColor(cam.state)

  return (
    <div className="flex h-10 w-full items-center gap-2 bg-white px-3 text-xs shadow-md">
      {cam.title && (
        <Tooltip label={cam.title} withArrow openDelay={500} position="bottom">
          <div className="flex h-full max-w-[260px] items-center border-r border-gray-200 pr-3">
            <span
              data-testid="model-title"
              className="grow truncate pr-2 text-gray-800"
            >
              <span className="mr-1 font-semibold text-gray-900">Title:</span>
              {cam.title}
            </span>
            <button
              data-testid="edit-model-title"
              aria-label="Edit model metadata"
              className="text-gray-500 hover:text-gray-800 focus:outline-hidden"
              onClick={openCamForm}
            >
              <FaPen size={12} />
            </button>
          </div>
        </Tooltip>
      )}

      {totalErrors > 0 && (
        <Chip
          icon={<FaExclamationTriangle size={12} />}
          chipClass="border-red-300 bg-red-100 text-red-900"
          circleClass="border-red-300 bg-red-200 text-red-700"
          onClick={openCamErrors}
        >
          {totalErrors} Error{totalErrors > 1 ? 's' : ''} Found
        </Chip>
      )}

      <div className="flex h-full items-center border-l border-r border-gray-200 px-1">
        <Tooltip
          label={cam.comments.length > 0 ? cam.comments.join(', ') : 'No comments'}
          position="bottom"
          withArrow
        >
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            className="text-gray-600 hover:text-gray-900"
            onClick={openCamForm}
          >
            <FaComment size={16} />
            {commentCount > 0 && (
              <span className="absolute right-0 top-0 rounded-md bg-green-700 px-1 py-px text-[10px] font-medium text-white">
                {commentCount}
              </span>
            )}
          </ActionIcon>
        </Tooltip>

        <Tooltip label="Make a copy of this model" position="bottom" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            className="text-gray-600 hover:text-gray-900"
            onClick={openCopyDialog}
          >
            <FaClone size={16} />
          </ActionIcon>
        </Tooltip>
      </div>

      {cam.state && (
        <Chip
          icon={<FaTasks size={12} />}
          chipClass={`${stateColor.chip} capitalize`}
          circleClass={stateColor.circle}
          onClick={openCamForm}
          trailing={<FaPen size={9} className="mr-1 opacity-60" />}
        >
          {cam.state}
        </Chip>
      )}

      {cam.date && (
        <Chip
          icon={<FaCalendarDay size={12} />}
          chipClass="border-sky-300 bg-sky-100 text-sky-900"
          circleClass="border-sky-300 bg-sky-200 text-sky-700"
          onClick={openCamForm}
        >
          {cam.date}
        </Chip>
      )}

      <ContributorChips contributors={cam.contributors || []} />

      <div className="ml-auto flex shrink-0 items-center justify-end gap-2">
        <ToolbarLinkMenu label="VIEW IN" items={viewInItems} />
        <ToolbarLinkMenu label="EXPORT AS" items={exportItems} />
      </div>
    </div>
  )
}

export default CamToolbar
