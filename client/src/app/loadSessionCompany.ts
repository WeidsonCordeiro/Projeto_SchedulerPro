import companyApi from "../api/endpoints/company.api";
import { getCompanyAbilities } from "../config/companyPermissions";
import type { AppDispatch, RootState } from "../store";
import { store } from "../store";
import { clearCompany, setCompany } from "../store/slices/companySlice";
import type { AuthSession } from "../types/auth";

/**
 * Remove empresa carregada quando o tenant da sessão não coincide (ex.: novo
 * login sem logout completo). Não altera credenciais.
 */
export function reconcileCompanySliceWithSession(
  dispatch: AppDispatch,
  session: AuthSession,
  getState: () => RootState = () => store.getState(),
): void {
  const loaded = getState().company.company;
  if (loaded && loaded.id !== session.companyId) {
    dispatch(clearCompany());
  }
}

/**
 * Carrega GET /companies para a sessão autenticada quando o role possui
 * COMPANY_READ (OWNER/ADMIN) e não há troca de senha pendente.
 * Falha na API não derruba a sessão.
 */
export async function loadSessionCompany(
  dispatch: AppDispatch,
  session: AuthSession,
  getState: () => RootState = () => store.getState(),
): Promise<void> {
  reconcileCompanySliceWithSession(dispatch, session, getState);

  const { role, mustChangePassword } = session;
  if (mustChangePassword || !getCompanyAbilities(role).canView) {
    return;
  }

  try {
    const companyResponse = await companyApi.getCompany();
    const company = companyResponse.data?.[0];
    if (company) {
      dispatch(setCompany(company));
    } else {
      dispatch(clearCompany());
    }
  } catch {
    dispatch(clearCompany());
  }
}
