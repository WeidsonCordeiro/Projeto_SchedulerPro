import { Role } from "../../../constants/roles";

export interface AppointmentReadScope {
  companyId: string;
  clientId?: string;
  employeeId?: string;
}

export type SessionUserForReadScope = {
  companyId: string;
  userId: string;
  role: Role;
  clientId?: string;
};

/**
 * Resolve o escopo de leitura de agendamentos a partir exclusivamente da sessão.
 * Nunca usar companyId, employeeId ou userId enviados pelo cliente como autorização.
 */
export function resolveAppointmentReadScope(
  user: SessionUserForReadScope,
): AppointmentReadScope {
  const companyId = user.companyId;

  if (user.role === Role.CLIENT) {
    return {
      companyId,
      ...(user.clientId ? { clientId: user.clientId } : {}),
    };
  }

  if (user.role === Role.EMPLOYEE) {
    return { companyId, employeeId: user.userId };
  }

  return { companyId };
}

/**
 * Leitura com escopo de empresa inteira (expiração global de scheduled vencidos).
 */
export function isCompanyWideAppointmentReadScope(
  scope: AppointmentReadScope,
): boolean {
  return !scope.clientId && !scope.employeeId;
}

/**
 * Filtros opcionais aplicados em consultas MongoDB de listagem/detalhe.
 */
export interface AppointmentListScope {
  clientId?: string;
  employeeId?: string;
}

export function toAppointmentListScope(
  readScope: AppointmentReadScope,
): AppointmentListScope | undefined {
  const listScope: AppointmentListScope = {};
  if (readScope.clientId) {
    listScope.clientId = readScope.clientId;
  }
  if (readScope.employeeId) {
    listScope.employeeId = readScope.employeeId;
  }
  return Object.keys(listScope).length > 0 ? listScope : undefined;
}
