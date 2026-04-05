import type React from 'react'
import { useMemo, useState } from 'react'
import { Button, IconButton, Menu, MenuItem, Tooltip } from '@mui/material'
import {
  FaCalendarDay,
  FaComment,
  FaClone,
  FaExclamationTriangle,
  FaPen,
  FaTasks,
} from 'react-icons/fa'
import { IoChevronDown } from 'react-icons/io5'
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

const CamToolbar: React.FC = () => {
  const dispatch = useAppDispatch()
  const cam = useAppSelector(selectCamModel)
  const baristaToken = useAppSelector(selectBaristaToken)
  const urls = useModelUrls(cam?.id, baristaToken)

  const [viewMenuAnchor, setViewMenuAnchor] = useState<null | HTMLElement>(null)
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null)
  const [contributorsMenuAnchor, setContributorsMenuAnchor] =
    useState<null | HTMLElement>(null)

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

  if (!cam) return null

  const commentCount = cam.comments?.length || 0
  const contributors = cam.contributors || []
  const visibleContributors = contributors.slice(0, 2)
  const hiddenContributors = contributors.slice(2)

  return (
    <div className="flex h-10 w-full items-center bg-white px-2 py-1 text-xs border-b border-gray-400">
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
            className="flex h-[25px] items-center gap-1.5 rounded-full bg-red-100 px-2.5 text-xs font-medium text-red-700 hover:bg-red-200"
          >
            <FaExclamationTriangle size={12} />
            <span>{totalErrors} Error(s) Found</span>
          </button>
        </div>
      )}

      {/* Comments */}
      <div className="h-full px-1">
        <Tooltip
          title={
            cam.comments.length > 0 ? cam.comments.join(', ') : 'No comments'
          }
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
          <div
            className={`flex h-6 items-center rounded-full border px-2 ${getStateColor(cam.state)}`}
          >
            <FaTasks size={12} className="mr-1" />
            <span>{cam.state}</span>
            <button
              className="ml-1 text-gray-500 hover:text-gray-700 focus:outline-none"
              onClick={openCamForm}
            >
              <FaPen size={10} />
            </button>
          </div>
        </div>
      )}

      {/* Date */}
      {cam.date && (
        <div className="flex items-center border-r border-gray-300 px-2">
          <div
            className="flex h-6 cursor-pointer items-center rounded-full border border-sky-400 bg-sky-200 pr-2 text-xs text-sky-800"
            onClick={openCamForm}
          >
            <div className="mr-1 flex h-full w-6 items-center justify-center rounded-full bg-sky-300 text-sky-800">
              <FaCalendarDay size={12} />
            </div>
            <span>{cam.date}</span>
          </div>
        </div>
      )}

      {/* Contributors */}
      <div className="flex flex-grow items-center overflow-x-auto px-2">
        <div className="flex flex-nowrap">
          {visibleContributors.map(contributor => (
            <div
              key={contributor.uri}
              className="mr-2 flex h-6 max-w-[180px] items-center truncate rounded-full border border-slate-400 bg-slate-300 pr-2 text-xs text-gray-800"
            >
              <div className="text-2xs mr-1 flex h-full min-w-6 items-center justify-center rounded-full bg-slate-400 text-center font-bold text-gray-800">
                {contributor.initials}
              </div>
              <span className="flex-grow truncate">{contributor.name}</span>
            </div>
          ))}

          {hiddenContributors.length > 0 && (
            <>
              <button
                className="flex h-6 cursor-pointer items-center rounded-full border border-slate-400 bg-slate-300 px-2 text-gray-800"
                onClick={e => setContributorsMenuAnchor(e.currentTarget)}
              >
                <span>...</span>
              </button>
              <Menu
                anchorEl={contributorsMenuAnchor}
                open={Boolean(contributorsMenuAnchor)}
                onClose={() => setContributorsMenuAnchor(null)}
              >
                {hiddenContributors.map(contributor => (
                  <MenuItem
                    key={contributor.uri}
                    onClick={() => setContributorsMenuAnchor(null)}
                  >
                    <div className="flex items-center">
                      <div className="text-2xs mr-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-400 text-center font-bold text-gray-800">
                        {contributor.initials}
                      </div>
                      <span>{contributor.name}</span>
                    </div>
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}
        </div>
      </div>

      {/* Right-side action buttons */}
      <div className="flex flex-shrink-0 items-center justify-end gap-2">
        {/* VIEW IN */}
        <Button
          variant="outlined"
          size="small"
          color="primary"
          onClick={e => setViewMenuAnchor(e.currentTarget)}
          endIcon={<IoChevronDown size={12} />}
          className="!text-xs !normal-case"
        >
          View In
        </Button>
        <Menu
          anchorEl={viewMenuAnchor}
          open={Boolean(viewMenuAnchor)}
          onClose={() => setViewMenuAnchor(null)}
        >
          <MenuItem onClick={() => setViewMenuAnchor(null)}>
            <a
              href={urls?.annotationPreview}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              Annotation Preview
            </a>
          </MenuItem>
          <MenuItem onClick={() => setViewMenuAnchor(null)}>
            <a
              href={urls?.pathwayViewer}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              Pathway Viewer
            </a>
          </MenuItem>
          <MenuItem onClick={() => setViewMenuAnchor(null)}>
            <a
              href={urls?.graphEditor}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              Graph Editor
            </a>
          </MenuItem>
        </Menu>

        {/* EXPORT AS */}
        <Button
          variant="outlined"
          size="small"
          color="primary"
          onClick={e => setExportMenuAnchor(e.currentTarget)}
          endIcon={<IoChevronDown size={12} />}
          className="!text-xs !normal-case"
        >
          Export As
        </Button>
        <Menu
          anchorEl={exportMenuAnchor}
          open={Boolean(exportMenuAnchor)}
          onClose={() => setExportMenuAnchor(null)}
        >
          <MenuItem onClick={() => setExportMenuAnchor(null)}>
            <a
              href={urls?.gpad}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              GPAD
            </a>
          </MenuItem>
          <MenuItem onClick={() => setExportMenuAnchor(null)}>
            <a
              href={urls?.owl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              OWL
            </a>
          </MenuItem>
        </Menu>
      </div>
    </div>
  )
}

export default CamToolbar
