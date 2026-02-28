import { useState } from 'react'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import YoutubeSearchedForIcon from '@mui/icons-material/YoutubeSearchedFor'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import type { LayoutDetail, LayoutSpacing } from '../graph/camCanvas'

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

const layoutDetailOptions: { id: LayoutDetail; label: string }[] = [
  { id: 'detailed', label: 'Detailed' },
  { id: 'activity', label: 'Activity' },
  { id: 'simple', label: 'Simple' },
]

const spacingOptions: { id: LayoutSpacing; label: string }[] = [
  { id: 'compact', label: 'Compact' },
  { id: 'relaxed', label: 'Loose' },
]

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
        variant="outlined"
        size="small"
        onClick={onAutoLayout}
        className="!text-xs !normal-case"
      >
        Automatic Layout
      </Button>

      <span className="ml-2 text-xs font-medium text-gray-600">Layout Detail:</span>
      <Button
        variant="outlined"
        size="small"
        onClick={e => setDetailAnchor(e.currentTarget)}
        endIcon={<ArrowDropDownIcon />}
        className="!text-xs !normal-case"
      >
        {currentDetail}
      </Button>
      <Menu
        anchorEl={detailAnchor}
        open={Boolean(detailAnchor)}
        onClose={() => setDetailAnchor(null)}
      >
        {layoutDetailOptions.map(opt => (
          <MenuItem
            key={opt.id}
            selected={opt.id === layoutDetail}
            onClick={() => {
              onLayoutDetailChange(opt.id)
              setDetailAnchor(null)
            }}
          >
            {opt.label}
          </MenuItem>
        ))}
      </Menu>

      <span className="ml-2 text-xs font-medium text-gray-600">Spacing:</span>
      <Button
        variant="outlined"
        size="small"
        onClick={e => setSpacingAnchor(e.currentTarget)}
        endIcon={<ArrowDropDownIcon />}
        className="!text-xs !normal-case"
      >
        {currentSpacing}
      </Button>
      <Menu
        anchorEl={spacingAnchor}
        open={Boolean(spacingAnchor)}
        onClose={() => setSpacingAnchor(null)}
      >
        {spacingOptions.map(opt => (
          <MenuItem
            key={opt.id}
            selected={opt.id === spacing}
            onClick={() => {
              onSpacingChange(opt.id)
              setSpacingAnchor(null)
            }}
          >
            {opt.label}
          </MenuItem>
        ))}
      </Menu>

      <span className="ml-2 text-xs font-medium text-gray-600">Zoom:</span>
      <div className="flex">
        <Button variant="outlined" size="small" onClick={onZoomOut} className="!min-w-0 !px-1">
          <ZoomOutIcon fontSize="small" />
        </Button>
        <Button variant="outlined" size="small" onClick={onZoomIn} className="!min-w-0 !px-1">
          <ZoomInIcon fontSize="small" />
        </Button>
        <Button variant="outlined" size="small" onClick={onZoomReset} className="!min-w-0 !px-1">
          <YoutubeSearchedForIcon fontSize="small" />
        </Button>
      </div>
    </div>
  )
}
