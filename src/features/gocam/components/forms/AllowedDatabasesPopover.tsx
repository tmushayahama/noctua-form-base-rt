import type React from 'react'
import { Popover, Chip } from '@mui/material'

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
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
    >
      <div className="p-4" style={{ minWidth: 200, maxWidth: 360 }}>
        <div className="mb-2 text-sm font-semibold">{title}</div>
        <div className="flex flex-wrap gap-1">
          {databases.map(db => (
            <Chip key={db} label={db} size="small" variant="outlined" />
          ))}
        </div>
      </div>
    </Popover>
  )
}

export default AllowedDatabasesPopover
