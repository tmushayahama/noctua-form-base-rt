import type React from 'react'
import { Dialog, DialogContent, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useAppSelector } from '@/app/hooks'
import { selectFormType, selectFormMode } from '../../slices/activityFormSlice'
import { ActivityType } from '../../models/cam'
import { FormMode } from '../../models/formModels'

interface ActivityFormDialogProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

function getDialogTitle(
  mode: FormMode | null,
  activityType: string | null
): string {
  const typeLabel =
    activityType === ActivityType.MOLECULE
      ? 'Chemical'
      : activityType === ActivityType.PROTEIN_COMPLEX
        ? 'Protein Complex'
        : 'Activity Unit'

  return mode === FormMode.EDIT ? `Edit ${typeLabel}` : `${typeLabel} Form`
}

const ActivityFormDialog: React.FC<ActivityFormDialogProps> = ({ open, onClose, children }) => {
  const activityType = useAppSelector(selectFormType)
  const mode = useAppSelector(selectFormMode)
  const title = getDialogTitle(mode, activityType)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{ className: 'overflow-hidden rounded-lg' }}
    >
      <div className="flex h-10 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3">
        <span className="text-sm font-bold text-gray-800">{title}</span>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </div>
      <DialogContent className="!p-0">{children}</DialogContent>
    </Dialog>
  )
}

export default ActivityFormDialog
