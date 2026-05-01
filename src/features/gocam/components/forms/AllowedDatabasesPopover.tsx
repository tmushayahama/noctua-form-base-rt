import type React from 'react'
import AnchoredPopover from '@/@noctua.core/components/popover/AnchoredPopover'

interface AllowedDatabasesPopoverProps {
  anchorEl: HTMLElement | null
  onClose: () => void
  title: string
  databases: readonly string[]
}

const AllowedDatabasesPopover: React.FC<AllowedDatabasesPopoverProps> = ({
  anchorEl,
  onClose,
  title,
  databases,
}) => {
  return (
    <AnchoredPopover anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose}>
      <div className="p-4" style={{ minWidth: 200, maxWidth: 360 }}>
        <div className="mb-2 text-sm font-semibold">{title}</div>
        <div className="flex flex-wrap gap-1">
          {databases.map(db => (
            <span
              key={db}
              className="rounded-full border border-gray-300 px-2 py-0.5 text-xs text-gray-700"
            >
              {db}
            </span>
          ))}
        </div>
      </div>
    </AnchoredPopover>
  )
}

export default AllowedDatabasesPopover
