// dialogSlice.ts
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface DialogState {
  open: boolean;
  title: string;
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth: boolean;
  showActions: boolean;
  confirmLabel: string;
  cancelLabel: string;
  preventBackdropClose: boolean;
  component: string | null; // <--- add this
  customProps: Record<string, any>;
}

const initialState: DialogState = {
  open: false,
  title: '',
  size: 'md',
  fullWidth: true,
  showActions: false,
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  preventBackdropClose: false,
  component: null,
  customProps: {},
};

export const dialogSlice = createSlice({
  name: 'dialog',
  initialState,
  reducers: {
    openDialog: (
      state,
      action: PayloadAction<Partial<DialogState> & { component: string }>
    ) => {
      return {
        ...state,
        open: true,
        ...action.payload,
      };
    },
    closeDialog: (state) => {
      state.open = false;
    },
  },
});

export const { openDialog, closeDialog } = dialogSlice.actions;
export default dialogSlice.reducer;
