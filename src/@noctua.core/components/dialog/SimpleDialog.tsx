import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogActions, Button, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

interface SimpleDialogProps {
  open: boolean
  onClose: () => void
  onConfirm?: () => void
  title?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  fullWidth?: boolean
  showActions?: boolean
  confirmLabel?: string
  cancelLabel?: string
  preventBackdropClose?: boolean
  children: ReactNode
}

const SimpleDialog = ({
  open,
  onClose,
  onConfirm,
  title = 'Add Simple',
  size = 'lg',
  fullWidth = true,
  showActions = false,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  preventBackdropClose = false,
  children,
}: SimpleDialogProps) => {
  const handleClose = (_event: {}, reason: string) => {
    if (preventBackdropClose && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
      return
    }
    onClose()
  }

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
    }
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth={fullWidth}
      maxWidth={size}
      PaperProps={{ className: 'overflow-hidden rounded-lg' }}
    >
      <div className="flex h-10 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3">
        <span className="text-sm font-bold text-gray-800">{title}</span>
        <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close" size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </div>
      <DialogContent className="p-0">{children}</DialogContent>
      {showActions && (
        <DialogActions className="border-t border-gray-200 bg-gray-100 px-3 py-2">
          <Button onClick={onClose} variant="outlined" color="inherit" size="small">
            {cancelLabel}
          </Button>
          <Button onClick={handleConfirm} variant="contained" color="primary" size="small">
            {confirmLabel}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  )
}

export default SimpleDialog
