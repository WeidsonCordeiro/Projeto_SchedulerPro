import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { APPOINTMENT_TIMEZONE } from "../../config/appointmentTime";
import type { Company } from "../../types/company";

/**
 * Estado de sessão da empresa autenticada.
 *
 * A empresa é carregada do backend autenticado (GET /companies) quando o
 * usuário possui COMPANY_READ (OWNER/ADMIN). O timezone da empresa precisa ser
 * consumido por AppointmentForm/AppointmentsPage (smart scheduling), por isso
 * fica no estado global de sessão em vez de estado local da página.
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
  },
});

export const { setCompany, clearCompany } = companySlice.actions;

/**
 * Empresa carregada da sessão (ou null).
 */
export function selectCompany(state: {
  company?: CompanyState;
}): Company | null {
  return state.company?.company ?? null;
}

/**
 * Timezone real da empresa quando disponível; caso contrário o mesmo valor
 * padrão assumido pelo backend (DEFAULT_TIMEZONE = "Europe/Lisbon").
 *
 * Usado pelos fluxos de agendamento. Para roles sem COMPANY_READ (MANAGER,
 * EMPLOYEE, CLIENT) o frontend continua usando o fallback enquanto o backend
 * não expuser o timezone a todos os autenticados (ver docs/stage-22 relatório).
 */
export function selectCompanyTimezone(state: {
  company?: CompanyState;
}): string {
  return state.company?.company?.timezone ?? APPOINTMENT_TIMEZONE;
}

export default companySlice.reducer;