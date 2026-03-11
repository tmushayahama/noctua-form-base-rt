import type React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material'
import { FiX } from 'react-icons/fi'

interface ActivityFormDialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

const ActivityFormDialog: React.FC<ActivityFormDialogProps> = ({
  open,
  onClose,
  title,
  children,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{ className: 'rounded-lg' }}
    >
      <DialogTitle className="flex items-center justify-between border-b pb-2">
        <span className="text-lg font-medium">{title}</span>
        <IconButton size="small" onClick={onClose}>
          <FiX />
        </IconButton>
      </DialogTitle>
      <DialogContent className="!p-4">{children}</DialogContent>
    </Dialog>
  )
}

export default ActivityFormDialog
