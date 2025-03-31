import type { PayloadAction } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";
import type { User } from "../user";

interface AuthState {
  user: User | null;
  baristaToken: string | null;
}

const initialState: AuthState = {
  user: null,
  baristaToken: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
    },
    setBaristaToken: (state, action: PayloadAction<string | null>) => {
      state.baristaToken = action.payload;
      if (action.payload) {
        localStorage.setItem('barista_token', action.payload);
      } else {
        localStorage.removeItem('barista_token');
      }
    },
    logout: (state) => {
      state.user = null;
      state.baristaToken = null;
      localStorage.removeItem('barista_token');
    },
  },
});

export const { setUser, setBaristaToken, logout } = authSlice.actions;

export default authSlice.reducer;