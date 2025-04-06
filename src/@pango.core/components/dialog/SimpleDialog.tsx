import type { ReactNode } from 'react';
import { Dialog, DialogTitle, IconButton, DialogContent, DialogActions, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface SimpleDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  showActions?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  preventBackdropClose?: boolean;
  children: ReactNode;
}

const SimpleDialog = ({
  open,
  onClose,
  onConfirm,
  title = "Add Simple",
  size = "lg",
  fullWidth = true,
  showActions = false,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  preventBackdropClose = false,
  children
}: SimpleDialogProps) => {

  const handleClose = (event: {}, reason: string) => {
    if (preventBackdropClose && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
      return;
    }
    onClose();
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth={fullWidth}
      maxWidth={size}
      PaperProps={{
        className: "rounded-lg"
      }}
    >
      <DialogTitle className="flex justify-between items-center border-b pb-2">
        <span className="text-lg font-medium">{title}</span>
        <IconButton
          edge="end"
          color="inherit"
          onClick={onClose}
          aria-label="close"
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent className="p-0">
        {children}
      </DialogContent>
      {showActions && (
        <DialogActions className="p-3 border-t">
          <Button onClick={onClose} variant="outlined" color="inherit">
            {cancelLabel}
          </Button>
          <Button onClick={handleConfirm} variant="contained" color="primary">
            {confirmLabel}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default SimpleDialog;

