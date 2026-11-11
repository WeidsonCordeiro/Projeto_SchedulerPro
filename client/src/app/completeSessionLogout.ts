import type { NavigateFunction } from "react-router-dom";

import authApi from "../api/endpoints/auth.api";
import type { AppDispatch } from "../store";
import {
  clearCredentials,
  clearSessionExpirationMessage,
  setLoading,
} from "../store/slices/authSlice";
import { clearCompany } from "../store/slices/companySlice";

export interface CompleteSessionLogoutOptions {
  loginState?: { successMessage?: string };
}

/**
 * Termina a sessão local e no backend (cookies), limpa Redux e redireciona para /login.
 * Padrão partilhado com Navbar e fluxos de saída após operações destrutivas.
 */
export async function completeSessionLogout(
  dispatch: AppDispatch,
  navigate: NavigateFunction,
  options?: CompleteSessionLogoutOptions,
): Promise<void> {
  dispatch(setLoading(true));
  try {
    await authApi.logout();
  } catch {
    // Erro recuperável no backend não deve deixar a UI fingindo autenticada.
  } finally {
    dispatch(clearCredentials());
    dispatch(clearSessionExpirationMessage());
    dispatch(clearCompany());
    navigate("/login", {
      replace: true,
      ...(options?.loginState ? { state: options.loginState } : {}),
    });
  }
}
