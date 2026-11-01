import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { APPOINTMENT_TIMEZONE } from "../../config/appointmentTime";
import { isValidIanaTimezone } from "../../config/timezones";
import type { AuthUser } from "../../types/auth";
import type { Company } from "../../types/company";

/**
 * Estado de sessão da empresa autenticada.
 *
 * A empresa é carregada do backend autenticado (GET /companies) quando o
 * usuário possui COMPANY_READ (OWNER/ADMIN). O timezone efetivo para
 * agendamento vem deste registo quando válido, ou de `auth.user.companyTimezone`
 * na sessão (todos os roles autenticados).
 */
export interface CompanyState {
  company: Company | null;
}

export const initialState: CompanyState = {
  company: null,
};

const companySlice = createSlice({
  name: "company",
  initialState,
  reducers: {
    setCompany(state, action: PayloadAction<Company>) {
      state.company = action.payload;
    },
    clearCompany(state) {
      state.company = null;
    },
    patchCompanyName(state, action: PayloadAction<string>) {
      if (state.company) {
        state.company.name = action.payload;
      }
    },
  },
});

export const { setCompany, clearCompany, patchCompanyName } = companySlice.actions;

/**
 * Empresa carregada da sessão (ou null).
 */
export function selectCompany(state: {
  company?: CompanyState;
}): Company | null {
  return state.company?.company ?? null;
}

export function resolveEffectiveCompanyTimezone(
  companyTimezone: string | undefined | null,
  sessionTimezone: string | undefined | null,
): string {
  if (companyTimezone && isValidIanaTimezone(companyTimezone)) {
    return companyTimezone;
  }
  if (sessionTimezone && isValidIanaTimezone(sessionTimezone)) {
    return sessionTimezone;
  }
  return APPOINTMENT_TIMEZONE;
}

/**
 * Timezone IANA efetivo da empresa: registo carregado, depois sessão
 * (`companyTimezone`), depois o mesmo fallback do backend (`Europe/Lisbon`).
 */
export function selectCompanyTimezone(state: {
  company?: CompanyState;
  auth?: { user: AuthUser | null };
}): string {
  return resolveEffectiveCompanyTimezone(
    state.company?.company?.timezone,
    state.auth?.user?.companyTimezone,
  );
}

const WORKSPACE_NAME_FALLBACK = "SchedulerPro";

/**
 * Nome da empresa no shell (sidebar): registo admin carregado, depois
 * `auth.user.companyName`, depois fallback do produto.
 */
export function selectWorkspaceDisplayName(state: {
  company?: CompanyState;
  auth?: { user: AuthUser | null };
}): string {
  const fromCompany = state.company?.company?.name?.trim();
  if (fromCompany) {
    return fromCompany;
  }
  const fromSession = state.auth?.user?.companyName?.trim();
  if (fromSession) {
    return fromSession;
  }
  return WORKSPACE_NAME_FALLBACK;
}

export default companySlice.reducer;
