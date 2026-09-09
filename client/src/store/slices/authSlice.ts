import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { AuthSession, AuthUser } from "../../types/auth";

export interface AuthState {
  user: AuthUser | null;
  mustChangePassword: boolean;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;
}

export const initialState: AuthState = {
  user: null,
  mustChangePassword: false,
  isAuthenticated: false,
  isInitializing: true,
  isLoading: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<AuthSession>) {
      const { mustChangePassword, ...user } = action.payload;
      state.user = user;
      state.mustChangePassword = mustChangePassword;
      state.isAuthenticated = true;
      state.isInitializing = false;
      state.isLoading = false;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    clearCredentials(state) {
      state.user = null;
      state.mustChangePassword = false;
      state.isAuthenticated = false;
      state.isInitializing = false;
      state.isLoading = false;
    },
  },
});

export const { setCredentials, setLoading, clearCredentials } = authSlice.actions;

export default authSlice.reducer;