import type React from 'react'
import { Modal } from '@mantine/core'
import { useAppSelector } from '@/app/hooks'
import { selectFormType, selectFormMode } from '../../slices/activityFormSlice'
import { ActivityType } from '../../models/cam'
import { FormMode } from '../../models/formModels'
import { resolveModalSize } from '@/@noctua.core/components/dialog/modalSize'
import DialogHeader from '@/@noctua.core/components/dialog/DialogHeader'

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
    <Modal
      opened={open}
      onClose={onClose}
      size={resolveModalSize('lg')}
      classNames={{ content: 'overflow-hidden' }}
    >
      <DialogHeader title={title} onClose={onClose} />
      <div>{children}</div>
    </Modal>
  )
}

export default ActivityFormDialog
