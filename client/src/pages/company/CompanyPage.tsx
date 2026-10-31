import { useCallback, useEffect, useState } from "react";
import companyApi from "../../api/endpoints/company.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import CompanyForm from "../../components/company/CompanyForm";
import DestructiveConfirmModal from "../../components/common/DestructiveConfirmModal";
import { getCompanyAbilities } from "../../config/companyPermissions";
import { useAppDispatch, useAppSelector } from "../../store";
import { setCompany } from "../../store/slices/companySlice";
import type { Company } from "../../types/company";
import PageHeader from "../../components/common/PageHeader";
import ErrorState from "../../components/common/ErrorState";
import LoadingState from "../../components/common/LoadingState";
import ImageAvatar from "../../components/common/ImageAvatar";
import { env } from "../../config/env";
import { getPublicBookingUrl } from "../../config/publicBookingUrl";

function CompanyReadOnlyProfile({ company }: { company: Company }) {
  return (
    <>
      <div className="d-flex align-items-center gap-3 mb-3">
        <ImageAvatar
          image={company.logo}
          name={company.name}
          kind="company"
          size="md"
          shape="rounded"
          alt=""
        />
        <span className="fw-semibold">{company.name}</span>
      </div>
      <dl className="row mb-0">
        <dt className="col-sm-3">Nome</dt>
        <dd className="col-sm-9">{company.name}</dd>
        <dt className="col-sm-3">Timezone</dt>
        <dd className="col-sm-9">{company.timezone}</dd>
      </dl>
    </>
  );
}

export default function CompanyPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { canView, canUpdate, canActivate, canDeactivate } =
    getCompanyAbilities(user?.role ?? null);

  const [company, setCompanyData] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [deactivateModalError, setDeactivateModalError] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!copyMessage) {
      return;
    }
    const timeout = window.setTimeout(() => setCopyMessage(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [copyMessage]);

  const publicBookingUrl = company
    ? getPublicBookingUrl(company.id, env.appUrl)
    : "";

  const canEditProfile = Boolean(canUpdate && company?.isActive);

  async function copyPublicBookingUrl() {
    try {
      await navigator.clipboard.writeText(publicBookingUrl);
      setCopyMessage("Link público copiado.");
    } catch {
      setCopyMessage("Não foi possível copiar o link. Copie-o manualmente.");
    }
  }

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

  function applyCompanyUpdate(updated: Company, successText: string) {
    setSuccessMessage(successText);
    setLifecycleError(null);
    setCompanyData(updated);
    dispatch(setCompany(updated));
  }

  function handleSaved(saved: Company) {
    applyCompanyUpdate(saved, "Empresa atualizada com sucesso.");
  }

  function handleLogoChanged(updated: Company) {
    setCompanyData(updated);
    dispatch(setCompany(updated));
  }

  function openDeactivateModal() {
    setDeactivateModalError(null);
    setDeactivateModalOpen(true);
  }

  function closeDeactivateModal() {
    if (lifecycleLoading) {
      return;
    }
    setDeactivateModalOpen(false);
    setDeactivateModalError(null);
  }

  async function handleConfirmDeactivate() {
    if (!company) {
      return;
    }

    setDeactivateModalError(null);
    setLifecycleLoading(true);
    try {
      const response = await companyApi.deactivateCompany(company.id);
      const updated = response.data;
      if (!updated) {
        setDeactivateModalError("Resposta inválida do servidor.");
        return;
      }
      applyCompanyUpdate(updated, "Empresa desativada com sucesso.");
      setDeactivateModalOpen(false);
    } catch (error) {
      const failure = getApiError(error);
      setDeactivateModalError(getFriendlyErrorMessage(failure));
    } finally {
      setLifecycleLoading(false);
    }
  }

  async function handleActivate() {
    if (!company) {
      return;
    }

    setLifecycleError(null);
    setLifecycleLoading(true);
    try {
      const response = await companyApi.activateCompany(company.id);
      const updated = response.data;
      if (!updated) {
        setLifecycleError("Resposta inválida do servidor.");
        return;
      }
      applyCompanyUpdate(updated, "Empresa reativada com sucesso.");
    } catch (error) {
      const failure = getApiError(error);
      setLifecycleError(getFriendlyErrorMessage(failure));
    } finally {
      setLifecycleLoading(false);
    }
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
      <PageHeader title="Empresa" description="Mantenha os dados e o fuso horário da empresa atualizados." />

      {successMessage && (
        <div className="alert alert-success" role="alert">
          {successMessage}
        </div>
      )}

      {lifecycleError && (
        <div className="alert alert-danger" role="alert">
          {lifecycleError}
        </div>
      )}

      {isLoading && <LoadingState label="A carregar empresa…" />}

      {!isLoading && loadError && (
        <ErrorState
          message={loadError}
          onRetry={() => void loadCompany()}
        />
      )}

      {!isLoading && !loadError && company && (
        <>
          <div className="card mb-4">
            <div className="card-header">
              <h2 className="h5 mb-0">Informações da empresa</h2>
            </div>
            <div className="card-body">
              <div className="mb-4">
                <label className="form-label" htmlFor="public-booking-url">
                  Link público de agendamento
                </label>
                <div className="input-group">
                  <input
                    id="public-booking-url"
                    className="form-control"
                    type="url"
                    value={publicBookingUrl}
                    readOnly
                  />
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={() => void copyPublicBookingUrl()}
                  >
                    Copiar link
                  </button>
                  <a
                    className="btn btn-outline-secondary"
                    href={publicBookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir link
                  </a>
                </div>
                {copyMessage && (
                  <div className="form-text" role="status">
                    {copyMessage}
                  </div>
                )}
                {!company.isActive && (
                  <p className="form-text mb-0" role="note">
                    Enquanto a empresa estiver suspensa, este link não aceita
                    novos agendamentos.
                  </p>
                )}
              </div>

              {canEditProfile ? (
                <CompanyForm
                  company={company}
                  onSaved={handleSaved}
                  onLogoChanged={handleLogoChanged}
                />
              ) : (
                <CompanyReadOnlyProfile company={company} />
              )}
            </div>
          </div>

          <div
            className={`card${!company.isActive && canActivate ? " border border-primary" : ""}`}
          >
            <div className="card-header">
              <h2 className="h5 mb-0">Estado operacional</h2>
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

              {company.isActive && canDeactivate && (
                <>
                  <p className="text-muted">
                    Desativar a empresa suspende os utilizadores que não sejam
                    OWNER e impede novos agendamentos pelo link público.
                  </p>
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={openDeactivateModal}
                    disabled={lifecycleLoading}
                  >
                    Desativar empresa
                  </button>
                </>
              )}

              {!company.isActive && canActivate && (
                <>
                  <h3 className="h6 mb-2">Reativar a empresa</h3>
                  <p className="text-muted">
                    Reativar restaura o acesso dos utilizadores suspendidos pela
                    desativação e volta a permitir o agendamento público.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void handleActivate()}
                    disabled={lifecycleLoading}
                  >
                    {lifecycleLoading && (
                      <span
                        className="spinner-border spinner-border-sm me-1"
                        aria-hidden="true"
                      />
                    )}
                    Reativar empresa
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      <DestructiveConfirmModal
        isOpen={deactivateModalOpen}
        title="Desativar empresa"
        onClose={closeDeactivateModal}
        onConfirm={() => void handleConfirmDeactivate()}
        isSubmitting={lifecycleLoading}
        errorMessage={deactivateModalError}
        confirmLabel="Desativar"
        submittingLabel="Desativando..."
        focusCancelOnOpen
        closeOnEscape
      >
        <p>Tem certeza que deseja desativar a empresa?</p>
        <p className="mb-0">
          Utilizadores que não sejam OWNER deixarão de aceder ao sistema e o
          agendamento público ficará indisponível até reativar.
        </p>
      </DestructiveConfirmModal>
    </section>
  );
}
