import { useCallback, useEffect, useState } from "react";
import companyApi from "../../api/endpoints/company.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import CompanyForm from "../../components/company/CompanyForm";
import { getCompanyAbilities } from "../../config/companyPermissions";
import { useAppDispatch, useAppSelector } from "../../store";
import { setCompany } from "../../store/slices/companySlice";
import type { Company } from "../../types/company";

export default function CompanyPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { canView, canUpdate } = getCompanyAbilities(user?.role ?? null);

  const [company, setCompanyData] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadCompany = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await companyApi.getCompany();
      const loaded = response.data?.[0] ?? null;
      if (!loaded) {
        setLoadError("Empresa não encontrada.");
        return;
      }
      setCompanyData(loaded);
      dispatch(setCompany(loaded));
    } catch (error) {
      const failure = getApiError(error);
      setLoadError(getFriendlyErrorMessage(failure));
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    if (!canView) {
      return;
    }
    void loadCompany();
  }, [canView, loadCompany]);

  function handleSaved(saved: Company) {
    setSuccessMessage("Empresa atualizada com sucesso.");
    setCompanyData(saved);
    dispatch(setCompany(saved));
  }

  if (!canView) {
    return (
      <section>
        <div className="mb-3">
          <h1 className="h3 mb-0">Empresa</h1>
        </div>
        <div className="alert alert-warning" role="alert">
          Você não tem permissão para acessar esta página.
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-3">
        <h1 className="h3 mb-0">Empresa</h1>
      </div>

      {successMessage && (
        <div className="alert alert-success" role="alert">
          {successMessage}
        </div>
      )}

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      )}

      {!isLoading && loadError && (
        <div className="alert alert-danger" role="alert">
          {loadError}
          <div className="mt-2">
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={() => void loadCompany()}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {!isLoading && !loadError && company && (
        <div className="card">
          <div className="card-header">
            <h2 className="h5 mb-0">Informações da empresa</h2>
          </div>
          <div className="card-body">
            <dl className="row mb-4">
              <dt className="col-sm-3">Estado</dt>
              <dd className="col-sm-9">
                {company.isActive ? (
                  <span className="badge text-bg-success">Ativa</span>
                ) : (
                  <span className="badge text-bg-secondary">Inativa</span>
                )}
              </dd>
            </dl>

            {canUpdate ? (
              <CompanyForm company={company} onSaved={handleSaved} />
            ) : (
              <dl className="row mb-0">
                <dt className="col-sm-3">Nome</dt>
                <dd className="col-sm-9">{company.name}</dd>
                <dt className="col-sm-3">Timezone</dt>
                <dd className="col-sm-9">{company.timezone}</dd>
              </dl>
            )}
          </div>
        </div>
      )}
    </section>
  );
}