import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAppDispatch } from "../store";
import { clearCredentials, setCredentials } from "../store/slices/authSlice";
import { clearCompany, setCompany } from "../store/slices/companySlice";
import authApi from "../api/endpoints/auth.api";
import companyApi from "../api/endpoints/company.api";
import { getCompanyAbilities } from "../config/companyPermissions";

export default function SessionBootstrap({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const response = await authApi.getMe();
        if (!active) return;
        if (response.data) {
          dispatch(setCredentials(response.data));

          // Empresa autenticada: apenas roles com COMPANY_READ (OWNER/ADMIN)
          // conseguem ler GET /companies. Isso alimenta o timezone real da
          // empresa no estado de sessão para os fluxos de agendamento.
          const { role, mustChangePassword } = response.data;
          if (getCompanyAbilities(role).canView && !mustChangePassword) {
            try {
              const companyResponse = await companyApi.getCompany();
              const company = companyResponse.data?.[0];
              if (active && company) {
                dispatch(setCompany(company));
              }
            } catch {
              // Falha ao carregar a empresa não derruba a sessão; o timezone
              // permanece no fallback e a página Empresa exibe o erro com retry.
              if (active) {
                dispatch(clearCompany());
              }
            }
          }
        } else {
          dispatch(clearCredentials());
          if (active) {
            dispatch(clearCompany());
          }
        }
      } catch {
        if (active) {
          dispatch(clearCredentials());
          dispatch(clearCompany());
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [dispatch]);

  return <>{children}</>;
}