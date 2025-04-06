import type { ReactNode } from "react";

export interface DialogConfig {
  id: string;
  title?: string;
  content: ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullScreen?: boolean;
  showActions?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  preventBackdropClose?: boolean;
  customStyles?: {
    paper?: string;
    title?: string;
    content?: string;
    actions?: string;
  };
}