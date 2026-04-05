import { useAppSelector, useAppDispatch } from '@/app/hooks'
import { closeDialog, DialogComponent, selectDialogState } from '@/@noctua.core/components/dialog/dialogSlice'
import SimpleDialog from './SimpleDialog'
import SearchAnnotations from '@/features/gocam/components/forms/SearchAnnotations'
import CamMetadataForm from '@/features/gocam/components/CamMetadataForm'
import CopyModelDialog from '@/features/gocam/components/CopyModelDialog'
import ChemicalConnectorForm from '@/features/relations/components/ChemicalConnectorForm'

const COMPONENT_MAP: Record<DialogComponent, React.ComponentType<any>> = {
  [DialogComponent.SEARCH_ANNOTATIONS]: SearchAnnotations,
  [DialogComponent.CAM_METADATA_FORM]: CamMetadataForm,
  [DialogComponent.COPY_MODEL_DIALOG]: CopyModelDialog,
  [DialogComponent.CHEMICAL_CONNECTOR_FORM]: ChemicalConnectorForm,
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
  } = useAppSelector(selectDialogState)

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
