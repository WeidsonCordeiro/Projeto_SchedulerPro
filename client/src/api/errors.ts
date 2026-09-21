import axios from "axios";
import type { ApiResponse, ApiValidationError } from "../types/api";

export type ApiErrorKind =
  | "network"
  | "validation"
  | "auth"
  | "not_found"
  | "conflict"
  | "server"
  | "unknown";

export interface ApiFailure {
  kind: ApiErrorKind;
  status?: number;
  message: string;
  errors?: ApiValidationError[];
  code?: string;
}

export function getApiError(error: unknown): ApiFailure {
  if (axios.isAxiosError<ApiResponse>(error)) {
    const status = error.response?.status;

    if (!error.response) {
      return { kind: "network", message: error.message };
    }

    const message = error.response.data?.message ?? "";
    const code = error.response.data?.code;

    if (status === 400) {
      return {
        kind: "validation",
        status,
        message,
        errors: error.response.data?.errors,
        code,
      };
    }

    if (status === 401 || status === 403) {
      return { kind: "auth", status, message, code };
    }

    if (status === 404) {
      return { kind: "not_found", status, message, code };
    }

    if (status === 409) {
      return { kind: "conflict", status, message, code };
    }

    if (status !== undefined && status >= 500) {
      return { kind: "server", status, message, code };
    }

    return { kind: "unknown", status, message, code };
  }

  return {
    kind: "unknown",
    message: error instanceof Error ? error.message : "Erro desconhecido.",
  };
}

const FRIENDLY_MESSAGES: Record<ApiErrorKind, string> = {
  network: "Não foi possível conectar ao servidor. Verifique sua conexão.",
  validation: "Dados inválidos. Verifique as informações e tente novamente.",
  auth: "Não foi possível autenticar. Verifique suas credenciais.",
  not_found: "Recurso não encontrado.",
  conflict: "Já existe um registro com os mesmos dados.",
  server: "Erro interno do servidor. Tente novamente mais tarde.",
  unknown: "Ocorreu um erro inesperado. Tente novamente.",
};

export function getFriendlyErrorMessage(failure: ApiFailure): string {
  if (failure.kind === "network") {
    return FRIENDLY_MESSAGES.network;
  }
  return failure.message?.trim() ? failure.message : FRIENDLY_MESSAGES[failure.kind];
}

export const SESSION_ERROR_CODES = {
  INVALID_SESSION: "INVALID_SESSION",
  SESSION_IDLE_TIMEOUT: "SESSION_IDLE_TIMEOUT",
  SESSION_ABSOLUTE_TIMEOUT: "SESSION_ABSOLUTE_TIMEOUT",
} as const;

export const SESSION_EXPIRY_MESSAGES: Record<string, string> = {
  [SESSION_ERROR_CODES.INVALID_SESSION]:
    "Sua sessão não é mais válida. Entre novamente.",
  [SESSION_ERROR_CODES.SESSION_IDLE_TIMEOUT]:
    "Sua sessão expirou por inatividade. Entre novamente.",
  [SESSION_ERROR_CODES.SESSION_ABSOLUTE_TIMEOUT]:
    "Sua sessão atingiu o tempo máximo de uso. Entre novamente.",
};

export function getSessionExpiryMessage(code?: string): string | null {
  if (!code) {
    return null;
  }

  return SESSION_EXPIRY_MESSAGES[code] ?? null;
}