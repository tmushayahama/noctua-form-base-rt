// components/dialog/GlobalDialog.tsx
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { closeDialog } from '@/@noctua.core/components/dialog/dialogSlice';
import type { RootState } from '@/app/store/store';
import SimpleDialog from './SimpleDialog';
import SearchAnnotations from '@/features/gocam/components/forms/SearchAnnotations';

// Optional: define a prop interface for each dialog
interface DialogPropsMap {
  SearchAnnotations: {
    gpId: string;
    aspect: string;
    term: string;
    evidence: string;
  };
  // Add more dialog mappings here as needed
}

// Type-safe component map
const COMPONENT_MAP: {
  [K in keyof DialogPropsMap]: React.ComponentType<DialogPropsMap[K]>;
} = {
  SearchAnnotations,
};

const GlobalDialog: React.FC = () => {
  const dispatch = useAppDispatch();
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
  } = useAppSelector((state: RootState) => state.dialog);

  if (!open || !component || !(component in COMPONENT_MAP)) return null;

  const DialogContent = COMPONENT_MAP[component as keyof DialogPropsMap];

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
      onConfirm={() => {
        console.log('Confirm clicked');
      }}
    >
      <DialogContent {...customProps} />
    </SimpleDialog>
  );
};

export default GlobalDialog;

