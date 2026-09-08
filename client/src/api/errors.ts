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
}

export function getApiError(error: unknown): ApiFailure {
  if (axios.isAxiosError<ApiResponse>(error)) {
    const status = error.response?.status;
    const message = error.response?.data?.message ?? error.message;

    if (!error.response) {
      return { kind: "network", message };
    }

    if (status === 400) {
      return {
        kind: "validation",
        status,
        message,
        errors: error.response.data?.errors,
      };
    }

    if (status === 401 || status === 403) {
      return { kind: "auth", status, message };
    }

    if (status === 404) {
      return { kind: "not_found", status, message };
    }

    if (status === 409) {
      return { kind: "conflict", status, message };
    }

    if (status !== undefined && status >= 500) {
      return { kind: "server", status, message };
    }

    return { kind: "unknown", status, message };
  }

  return {
    kind: "unknown",
    message: error instanceof Error ? error.message : "Erro desconhecido.",
  };
}