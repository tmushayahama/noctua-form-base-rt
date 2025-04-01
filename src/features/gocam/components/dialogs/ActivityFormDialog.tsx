import type React from 'react';
import { Dialog, DialogTitle, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface ActivityDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const ActivityDialog: React.FC<ActivityDialogProps> = ({
  open,
  onClose,
  title = "Add Activity",
  children
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        padding: 0,
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
      <div className="p-0">
        {children}
      </div>
    </Dialog>
  );
};

export default ActivityDialog;