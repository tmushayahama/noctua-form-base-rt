import type React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material'
import { FiX } from 'react-icons/fi'
import { useAppSelector } from '@/app/hooks'
import { selectFormType, selectFormMode } from '../../slices/activityFormSlice'

interface ActivityFormDialogProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

function getDialogTitle(
  mode: 'create' | 'edit' | null,
  activityType: string | null
): string {
  const typeLabel =
    activityType === 'molecule'
      ? 'Chemical'
      : activityType === 'proteinComplex'
        ? 'Protein Complex'
        : 'Activity Unit'

  return mode === 'edit' ? `Edit ${typeLabel}` : `${typeLabel} Form`
}

const ActivityFormDialog: React.FC<ActivityFormDialogProps> = ({
  open,
  onClose,
  children,
}) => {
  const activityType = useAppSelector(selectFormType)
  const mode = useAppSelector(selectFormMode)
  const title = getDialogTitle(mode, activityType)

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
