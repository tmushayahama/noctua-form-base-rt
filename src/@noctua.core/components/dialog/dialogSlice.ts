import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export enum DialogComponent {
  SEARCH_ANNOTATIONS = 'SearchAnnotations',
  CAM_METADATA_FORM = 'CamMetadataForm',
  COPY_MODEL_DIALOG = 'CopyModelDialog',
  CHEMICAL_CONNECTOR_FORM = 'ChemicalConnectorForm',
}

interface DialogState {
  open: boolean;
  title: string;
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth: boolean;
  showActions: boolean;
  confirmLabel: string;
  cancelLabel: string;
  preventBackdropClose: boolean;
  component: DialogComponent | null;
  customProps: Record<string, unknown>;
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
      action: PayloadAction<Partial<DialogState> & { component: DialogComponent }>
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

export const selectDialogState = (state: { dialog: DialogState }) => state.dialog

export default dialogSlice.reducer;
