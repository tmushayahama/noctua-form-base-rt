import type React from 'react'
import { useMemo } from 'react'
import { IconButton, Tooltip } from '@mui/material'
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
import { processViolations, computeDiffs, computeTotalErrors } from '../services/violationService'
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
        size: 'sm',
      })
    )
  }

  const totalErrors = useMemo(() => {
    if (!cam) return 0
    const violations = processViolations(cam)
    const { diffNodes, diffEdges } = computeDiffs(cam)
    return computeTotalErrors(violations, diffNodes, diffEdges)
  }, [cam])

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

  return (
    <div className="flex h-10 w-full items-center border-b border-gray-400 bg-white px-2 py-1 text-xs">
      {/* Title */}
      {cam.title && (
        <div className="flex h-full max-w-[250px] items-center border-r border-gray-300 px-2">
          <span className="flex-grow truncate pr-2">
            <span className="mr-2 font-bold">Title:</span>
            {cam.title}
          </span>
          <button
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            onClick={openCamForm}
          >
            <FaPen size={12} />
          </button>
        </div>
      )}

      {/* Error chip */}
      {totalErrors > 0 && (
        <div className="flex items-center px-2">
          <button
            onClick={openCamErrors}
            className="flex h-6 cursor-pointer items-center rounded-full border border-gray-400 bg-gray-100 pr-2 text-xs hover:bg-gray-200"
          >
            <div className="mr-1 flex h-full w-6 items-center justify-center rounded-full border-r border-red-300 bg-red-200 text-red-600">
              <FaExclamationTriangle size={12} />
            </div>
            <span>{totalErrors} Error(s) Found</span>
          </button>
        </div>
      )}

      {/* Comments */}
      <div className="h-full px-1">
        <Tooltip
          title={cam.comments.length > 0 ? cam.comments.join(', ') : 'No comments'}
          placement="top"
        >
          <IconButton
            className="text-gray-600 hover:text-gray-800"
            onClick={openCamForm}
          >
            <FaComment size={16} />
            <span className="text-2xs absolute right-0 top-0 rounded-md bg-green-800 px-1 py-px text-white">
              {commentCount}
            </span>
          </IconButton>
        </Tooltip>
      </div>

      {/* Clone */}
      <div className="border-r border-gray-300 px-1">
        <Tooltip title="Make a copy of this model" placement="top">
          <IconButton
            className="text-gray-600 hover:text-gray-800"
            onClick={() =>
              dispatch(
                openDialog({
                  component: DialogComponent.COPY_MODEL_DIALOG,
                  title: 'Copy Model',
                  size: 'sm',
                })
              )
            }
          >
            <FaClone size={16} />
          </IconButton>
        </Tooltip>
      </div>

      {/* State */}
      {cam.state && (
        <div className="flex h-full max-w-[150px] items-center border-r border-gray-300 px-2">
          {(() => {
            const stateColor = getStateColor(cam.state)
            return (
              <div
                className="flex h-6 cursor-pointer items-center rounded-full border border-gray-400 bg-gray-100 pr-2 text-xs"
                onClick={openCamForm}
              >
                <div
                  className={`mr-1 flex h-full w-6 items-center justify-center rounded-full border-r ${stateColor.circle}`}
                >
                  <FaTasks size={12} />
                </div>
                <span>{cam.state}</span>
                <button
                  className="ml-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                  onClick={openCamForm}
                >
                  <FaPen size={10} />
                </button>
              </div>
            )
          })()}
        </div>
      )}

      {/* Date */}
      {cam.date && (
        <div className="flex items-center border-r border-gray-300 px-2">
          <div
            className="flex h-6 cursor-pointer items-center rounded-full border border-gray-400 bg-gray-100 pr-2 text-xs"
            onClick={openCamForm}
          >
            <div className="mr-1 flex h-full w-6 items-center justify-center rounded-full border-r bg-sky-50 border-sky-300 text-sky-400">
              <FaCalendarDay size={12} />
            </div>
            <span>{cam.date}</span>
          </div>
        </div>
      )}

      {/* Contributors */}
      <ContributorChips contributors={cam.contributors || []} />

      {/* Right-side action buttons */}
      <div className="flex flex-shrink-0 items-center justify-end gap-2">
        <ToolbarLinkMenu label="View In" items={viewInItems} />
        <ToolbarLinkMenu label="Export As" items={exportItems} />
      </div>
    </div>
  )
}

export default CamToolbar
