import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { AuthSession, AuthUser } from "../../types/auth";

export interface AuthState {
  user: AuthUser | null;
  mustChangePassword: boolean;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  /**
   * Mensagem amigável de expiração/invalidação de sessão, definida pelo
   * interceptor de API quando o refresh falha com um código de sessão
   * definitivo (INVALID_SESSION / SESSION_IDLE_TIMEOUT / SESSION_ABSOLUTE_TIMEOUT).
   *
   * Vive no Redux (não em localStorage/sessionStorage) para sobreviver ao
   * redirect para /login e ser exibida pela LoginPage como feedback.
   *
   * É opcional por contrato: ausente/undefined equivale a "nenhuma mensagem",
   * o que mantém a compatibilidade com testes e estados pré-existentes.
   */
  sessionExpirationMessage?: string | null;
}

export const initialState: AuthState = {
  user: null,
  mustChangePassword: false,
  isAuthenticated: false,
  isInitializing: true,
  isLoading: false,
  sessionExpirationMessage: null,
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
      // Login/refresh bem-sucedidos descartam qualquer mensagem de expiração
      // anterior para não reaparecer em uma próxima visita ao /login.
      state.sessionExpirationMessage = null;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    clearMustChangePassword(state) {
      state.mustChangePassword = false;
      state.isLoading = false;
    },
    clearCredentials(state) {
      state.user = null;
      state.mustChangePassword = false;
      state.isAuthenticated = false;
      state.isInitializing = false;
      state.isLoading = false;
      // NOTE: clearCredentials NÃO limpa sessionExpirationMessage de propósito.
      // O interceptor define a mensagem antes de limpar as credenciais; se
      // este reducer apagasse o campo, o feedback se perderia ao redirecionar
      // para /login. A mensagem é consumida e limpa pela LoginPage.
    },
    setSessionExpirationMessage(state, action: PayloadAction<string>) {
      state.sessionExpirationMessage = action.payload;
    },
    clearSessionExpirationMessage(state) {
      state.sessionExpirationMessage = null;
    },
  },
});

export const {
  setCredentials,
  setLoading,
  clearMustChangePassword,
  clearCredentials,
  setSessionExpirationMessage,
  clearSessionExpirationMessage,
} = authSlice.actions;

export default authSlice.reducer;