
import type { PayloadAction } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";
import type { Contributor, Group } from "../models/contributor";

interface metadataState {
  users: Contributor[];
  groups: Group[];
  loading: boolean;
}

const initialState: metadataState = {
  users: [],
  groups: [],
  loading: false
};

export const metadataSlice = createSlice({
  name: 'metadata',
  initialState,
  reducers: {
    setUsers: (state, action: PayloadAction<any[]>) => {
      state.users = action.payload;
    },
    setGroups: (state, action: PayloadAction<any[]>) => {
      state.groups = action.payload;
    }
  }
});

export const { setUsers, setGroups } = metadataSlice.actions;

export default metadataSlice.reducer;