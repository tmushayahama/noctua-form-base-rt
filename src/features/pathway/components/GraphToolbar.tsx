import { useState } from 'react'
import { Button } from '@mantine/core'
import AnchoredMenu, { MenuItem } from '@/@noctua.core/components/menu/AnchoredMenu'
import {
  MdZoomIn as ZoomInIcon,
  MdZoomOut as ZoomOutIcon,
  MdYoutubeSearchedFor as YoutubeSearchedForIcon,
  MdArrowDropDown as ArrowDropDownIcon,
} from 'react-icons/md'
import type { LayoutDetail, LayoutSpacing } from '../graph/camCanvas'
import { layoutDetailOptions, spacingOptions } from '../data/toolbarOptions'

interface GraphToolbarProps {
  layoutDetail: LayoutDetail
  spacing: LayoutSpacing
  onAutoLayout: () => void
  onLayoutDetailChange: (detail: LayoutDetail) => void
  onSpacingChange: (spacing: LayoutSpacing) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
}

export default function GraphToolbar({
  layoutDetail,
  spacing,
  onAutoLayout,
  onLayoutDetailChange,
  onSpacingChange,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}: GraphToolbarProps) {
  const [detailAnchor, setDetailAnchor] = useState<null | HTMLElement>(null)
  const [spacingAnchor, setSpacingAnchor] = useState<null | HTMLElement>(null)

  const currentDetail = layoutDetailOptions.find(o => o.id === layoutDetail)?.label ?? 'Detailed'
  const currentSpacing = spacingOptions.find(o => o.id === spacing)?.label ?? 'Compact'

  return (
    <div className="flex w-full items-center gap-2 border-b border-gray-300 bg-white px-3 py-1">
      <Button
        variant="outline"
        size="xs"
        onClick={onAutoLayout}
        className="!text-xs !normal-case"
      >
        Automatic Layout
      </Button>

      <span className="ml-2 text-xs font-medium text-gray-600">Layout Detail:</span>
      <Button
        variant="outline"
        size="xs"
        onClick={e => setDetailAnchor(e.currentTarget)}
        rightSection={<ArrowDropDownIcon />}
        className="!text-xs !normal-case"
      >
        {currentDetail}
      </Button>
      <AnchoredMenu
        anchorEl={detailAnchor}
        open={Boolean(detailAnchor)}
        onClose={() => setDetailAnchor(null)}
      >
        {layoutDetailOptions.map(opt => (
          <MenuItem
            key={opt.id}
            className={opt.id === layoutDetail ? 'bg-blue-50' : ''}
            onClick={() => {
              onLayoutDetailChange(opt.id)
              setDetailAnchor(null)
            }}
          >
            {opt.label}
          </MenuItem>
        ))}
      </AnchoredMenu>

      <span className="ml-2 text-xs font-medium text-gray-600">Spacing:</span>
      <Button
        variant="outline"
        size="xs"
        onClick={e => setSpacingAnchor(e.currentTarget)}
        rightSection={<ArrowDropDownIcon />}
        className="!text-xs !normal-case"
      >
        {currentSpacing}
      </Button>
      <AnchoredMenu
        anchorEl={spacingAnchor}
        open={Boolean(spacingAnchor)}
        onClose={() => setSpacingAnchor(null)}
      >
        {spacingOptions.map(opt => (
          <MenuItem
            key={opt.id}
            className={opt.id === spacing ? 'bg-blue-50' : ''}
            onClick={() => {
              onSpacingChange(opt.id)
              setSpacingAnchor(null)
            }}
          >
            {opt.label}
          </MenuItem>
        ))}
      </AnchoredMenu>

      <span className="ml-2 text-xs font-medium text-gray-600">Zoom:</span>
      <div className="flex">
        <Button variant="outline" size="xs" onClick={onZoomOut} className="!min-w-0 !px-1">
          <ZoomOutIcon size={18} />
        </Button>
        <Button variant="outline" size="xs" onClick={onZoomIn} className="!min-w-0 !px-1">
          <ZoomInIcon size={18} />
        </Button>
        <Button variant="outline" size="xs" onClick={onZoomReset} className="!min-w-0 !px-1">
          <YoutubeSearchedForIcon size={18} />
        </Button>
      </div>
    </div>
  )
}
