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

/** Espelha mensagens do backend quando `code` ainda não vem na resposta. */
export const BACKEND_COMPANY_INACTIVE_OPERATION_MESSAGE =
  "A empresa está desactivada. Esta operação não está disponível.";

export const BACKEND_COMPANY_INACTIVE_ACCESS_MESSAGE =
  "A empresa está desactivada. O acesso ao sistema não está disponível.";

export const COMPANY_INACTIVE_ERROR_CODES = {
  COMPANY_INACTIVE_OPERATION: "COMPANY_INACTIVE_OPERATION",
  COMPANY_INACTIVE_ACCESS: "COMPANY_INACTIVE_ACCESS",
} as const;

export const COMPANY_INACTIVE_FRIENDLY_MESSAGES: Record<string, string> = {
  [COMPANY_INACTIVE_ERROR_CODES.COMPANY_INACTIVE_OPERATION]:
    "Esta operação não pode ser concluída porque a empresa está suspensa. Reative a empresa para voltar a editar dados, gerir a logo e usar as funcionalidades operacionais.",
  [COMPANY_INACTIVE_ERROR_CODES.COMPANY_INACTIVE_ACCESS]:
    "O acesso está limitado porque a empresa está suspensa. Contacte o OWNER da empresa para reativar a conta.",
};

const BACKEND_MESSAGE_TO_INACTIVE_CODE: Record<string, string> = {
  [BACKEND_COMPANY_INACTIVE_OPERATION_MESSAGE]:
    COMPANY_INACTIVE_ERROR_CODES.COMPANY_INACTIVE_OPERATION,
  [BACKEND_COMPANY_INACTIVE_ACCESS_MESSAGE]:
    COMPANY_INACTIVE_ERROR_CODES.COMPANY_INACTIVE_ACCESS,
};

export const STAFF_COMPANY_SUSPENSION_ERROR_CODES = {
  USER_SUSPENDED_BY_COMPANY_DEACTIVATION:
    "USER_SUSPENDED_BY_COMPANY_DEACTIVATION",
  USER_INACTIVE: "USER_INACTIVE",
} as const;

export const STAFF_COMPANY_SUSPENSION_FRIENDLY_MESSAGE =
  "Empresa temporariamente suspensa. A empresa está inactiva e o acesso operacional não está disponível. Contacte o OWNER da empresa para mais informações.";

export const USER_INACTIVE_FRIENDLY_MESSAGE =
  "A sua conta está desactivada. Contacte o administrador da empresa se precisar de reactivar o acesso.";

export const STAFF_SUSPENSION_FRIENDLY_MESSAGES: Record<string, string> = {
  [STAFF_COMPANY_SUSPENSION_ERROR_CODES.USER_SUSPENDED_BY_COMPANY_DEACTIVATION]:
    STAFF_COMPANY_SUSPENSION_FRIENDLY_MESSAGE,
  [STAFF_COMPANY_SUSPENSION_ERROR_CODES.USER_INACTIVE]:
    USER_INACTIVE_FRIENDLY_MESSAGE,
};

export function isStaffCompanySuspensionCode(code?: string): boolean {
  return (
    code ===
    STAFF_COMPANY_SUSPENSION_ERROR_CODES.USER_SUSPENDED_BY_COMPANY_DEACTIVATION
  );
}

function resolveStaffAccessFriendlyMessage(failure: ApiFailure): string | null {
  const code = failure.code?.trim();
  if (code && STAFF_SUSPENSION_FRIENDLY_MESSAGES[code]) {
    return STAFF_SUSPENSION_FRIENDLY_MESSAGES[code];
  }
  return null;
}

/** Remove mensagens repetidas preservando a ordem (ex.: falhas paralelas). */
export function collapseDuplicateMessages(messages: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const message of messages) {
    const trimmed = message.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function resolveCompanyInactiveFriendlyMessage(failure: ApiFailure): string | null {
  const codeFromResponse = failure.code?.trim();
  if (
    codeFromResponse &&
    COMPANY_INACTIVE_FRIENDLY_MESSAGES[codeFromResponse]
  ) {
    return COMPANY_INACTIVE_FRIENDLY_MESSAGES[codeFromResponse];
  }

  const message = failure.message?.trim() ?? "";
  const mappedCode = BACKEND_MESSAGE_TO_INACTIVE_CODE[message];
  if (mappedCode) {
    return COMPANY_INACTIVE_FRIENDLY_MESSAGES[mappedCode];
  }

  return null;
}

export const AVAILABILITY_EMPLOYEES_LIST_SUSPENDED_MESSAGE =
  "A lista de funcionários está indisponível enquanto a empresa estiver suspensa. Está a consultar a sua própria disponibilidade.";

const AVAILABILITY_EMPLOYEES_LOAD_SUFFIX =
  "Lista de funcionários indisponível; será exibida a sua própria disponibilidade.";

export function isCompanyInactiveOperationFailure(failure: ApiFailure): boolean {
  const code = failure.code?.trim();
  if (code === COMPANY_INACTIVE_ERROR_CODES.COMPANY_INACTIVE_OPERATION) {
    return true;
  }
  const message = failure.message?.trim() ?? "";
  return message === BACKEND_COMPANY_INACTIVE_OPERATION_MESSAGE;
}

/** Erro operacional de empresa suspensa já explicado pelo banner global no AppLayout. */
export function isDuplicateCompanyInactivePageError(
  failure: ApiFailure,
  companyIsActive: boolean | undefined,
): boolean {
  return companyIsActive === false && isCompanyInactiveOperationFailure(failure);
}

export function resolveAvailabilityEmployeesLoadNotice(
  failure: ApiFailure,
  companyIsActive: boolean | undefined,
): string {
  if (isDuplicateCompanyInactivePageError(failure, companyIsActive)) {
    return AVAILABILITY_EMPLOYEES_LIST_SUSPENDED_MESSAGE;
  }
  const friendly = getFriendlyErrorMessage(failure);
  return `${friendly} ${AVAILABILITY_EMPLOYEES_LOAD_SUFFIX}`;
}

export function collectRelatedFailureMessages(
  failures: string[],
  error: unknown,
  companyIsActive: boolean | undefined,
): void {
  const failure = getApiError(error);
  if (isDuplicateCompanyInactivePageError(failure, companyIsActive)) {
    return;
  }
  failures.push(getFriendlyErrorMessage(failure));
}

export interface PageLoadErrorPresentation {
  message: string | null;
  retryable: boolean;
}

export function getPageLoadErrorPresentation(
  failure: ApiFailure,
  companyIsActive: boolean | undefined,
): PageLoadErrorPresentation {
  if (isDuplicateCompanyInactivePageError(failure, companyIsActive)) {
    return { message: null, retryable: false };
  }
  return {
    message: getFriendlyErrorMessage(failure),
    retryable: true,
  };
}

export function formatRelatedFailuresMessage(
  failures: string[],
  prefix: string,
): string | null {
  const unique = collapseDuplicateMessages(failures);
  if (unique.length === 0) {
    return null;
  }
  return `${prefix} ${unique.join(" ")}`;
}

export function getFriendlyErrorMessage(failure: ApiFailure): string {
  if (failure.kind === "network") {
    return FRIENDLY_MESSAGES.network;
  }

  const staffAccessMessage = resolveStaffAccessFriendlyMessage(failure);
  if (staffAccessMessage) {
    return staffAccessMessage;
  }

  const companyInactiveMessage = resolveCompanyInactiveFriendlyMessage(failure);
  if (companyInactiveMessage) {
    return companyInactiveMessage;
  }

  return failure.message?.trim() ? failure.message : FRIENDLY_MESSAGES[failure.kind];
}

export const SESSION_ERROR_CODES = {
  INVALID_SESSION: "INVALID_SESSION",
  SESSION_IDLE_TIMEOUT: "SESSION_IDLE_TIMEOUT",
  SESSION_ABSOLUTE_TIMEOUT: "SESSION_ABSOLUTE_TIMEOUT",
} as const;

export const DEFAULT_SESSION_EXPIRY_MESSAGE =
  "Sua sessão não é mais válida. Entre novamente.";

export const SESSION_EXPIRY_MESSAGES: Record<string, string> = {
  [SESSION_ERROR_CODES.INVALID_SESSION]: DEFAULT_SESSION_EXPIRY_MESSAGE,
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