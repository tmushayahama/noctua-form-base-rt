import { ActionIcon } from '@mantine/core'
import { MdClose as CloseIcon } from 'react-icons/md'

interface DialogHeaderProps {
  title: string
  onClose: () => void
}

const DialogHeader = ({ title, onClose }: DialogHeaderProps) => (
  <div className="flex h-11 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
    <span className="text-sm font-semibold text-gray-800">{title}</span>
    <ActionIcon onClick={onClose} aria-label="close">
      <CloseIcon size={18} />
    </ActionIcon>
  </div>
)

export default DialogHeader
