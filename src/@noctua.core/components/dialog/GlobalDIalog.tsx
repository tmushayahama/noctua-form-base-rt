import { useAppSelector, useAppDispatch } from '@/app/hooks'
import { closeDialog } from '@/@noctua.core/components/dialog/dialogSlice'
import type { RootState } from '@/app/store/store'
import SimpleDialog from './SimpleDialog'
import SearchAnnotations from '@/features/gocam/components/forms/SearchAnnotations'

const COMPONENT_MAP: Record<string, React.ComponentType<any>> = {
  SearchAnnotations,
}

const GlobalDialog: React.FC = () => {
  const dispatch = useAppDispatch()
  const {
    open,
    title,
    size,
    fullWidth,
    showActions,
    confirmLabel,
    cancelLabel,
    component,
    customProps,
  } = useAppSelector((state: RootState) => state.dialog)

  if (!open || !component || !(component in COMPONENT_MAP)) return null

  const DialogContent = COMPONENT_MAP[component]

  return (
    <SimpleDialog
      open={open}
      title={title}
      size={size}
      fullWidth={fullWidth}
      showActions={showActions}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      onClose={() => dispatch(closeDialog())}
      onConfirm={() => dispatch(closeDialog())}
    >
      <DialogContent {...customProps} />
    </SimpleDialog>
  )
}

export default GlobalDialog
