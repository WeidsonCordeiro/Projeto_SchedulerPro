import { useCallback, useEffect, useState } from "react";
import clientsApi from "../../api/endpoints/clients.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import { useAppSelector } from "../../store";
import type { Client } from "../../types/client";
import { ROLE_LABELS } from "../../config/roles";

export default function PortalProfilePage() {
  const user = useAppSelector((state) => state.auth.user);

  const [profile, setProfile] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await clientsApi.getClientMe();
      setProfile(response.data ?? null);
    } catch (error) {
      const failure = getApiError(error);
      setLoadError(getFriendlyErrorMessage(failure));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  return (
    <section>
      <h1 className="h3 mb-3">Meu perfil</h1>

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
              onClick={() => void loadProfile()}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {!isLoading && !loadError && (
        <div className="row g-3">
          <div className="col-md-6">
            <div className="card">
              <div className="card-header fw-semibold">Dados da conta</div>
              <div className="card-body">
                <dl className="row mb-0">
                  <dt className="col-sm-4 text-muted">Nome</dt>
                  <dd className="col-sm-8">{user?.name}</dd>

                  <dt className="col-sm-4 text-muted">Email</dt>
                  <dd className="col-sm-8">{user?.email}</dd>

                  <dt className="col-sm-4 text-muted">Perfil</dt>
                  <dd className="col-sm-8">
                    {user ? ROLE_LABELS[user.role] ?? user.role : "—"}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card">
              <div className="card-header fw-semibold">Dados cadastrais</div>
              <div className="card-body">
                {!profile ? (
                  <p className="mb-0 text-muted">Perfil do cliente não encontrado.</p>
                ) : (
                  <dl className="row mb-0">
                    <dt className="col-sm-4 text-muted">Nome</dt>
                    <dd className="col-sm-8">{profile.name}</dd>

                    <dt className="col-sm-4 text-muted">Email</dt>
                    <dd className="col-sm-8">{profile.email ?? "—"}</dd>

                    <dt className="col-sm-4 text-muted">Telefone</dt>
                    <dd className="col-sm-8">{profile.phone}</dd>

                    <dt className="col-sm-4 text-muted">Observações</dt>
                    <dd className="col-sm-8">{profile.notes ?? "—"}</dd>
                  </dl>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}