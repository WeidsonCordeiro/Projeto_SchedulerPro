import { useCallback, useEffect, useState } from "react";
import clientsApi from "../../api/endpoints/clients.api";
import { getApiError, getPageLoadErrorPresentation } from "../../api/errors";
import ClientForm from "../../components/clients/ClientForm";
import DeleteClientModal from "../../components/clients/DeleteClientModal";
import SendClientInviteModal from "../../components/clients/SendClientInviteModal";
import { getClientAbilities } from "../../config/clientPermissions";
import { useAppSelector } from "../../store";
import { selectCompany } from "../../store/slices/companySlice";
import type { Client } from "../../types/client";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import LoadingState from "../../components/common/LoadingState";
import ImageAvatar from "../../components/common/ImageAvatar";
import DashboardCard from "../../components/common/DashboardCard";

export default function ClientsPage() {
  const user = useAppSelector((state) => state.auth.user);
  const company = useAppSelector(selectCompany);
  const companyIsActive = company?.isActive;
  const { canCreate, canUpdate, canDelete, canInvite } = getClientAbilities(
    user?.role ?? null
  );

  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadErrorRetryable, setLoadErrorRetryable] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [invitingClient, setInvitingClient] = useState<Client | null>(null);

  const loadClients = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await clientsApi.getClients();
      setClients(response.data ?? []);
    } catch (error) {
      const presentation = getPageLoadErrorPresentation(
        getApiError(error),
        companyIsActive,
      );
      setLoadError(presentation.message);
      setLoadErrorRetryable(presentation.retryable);
    } finally {
      setIsLoading(false);
    }
  }, [companyIsActive]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  function openCreate() {
    setEditingClient(null);
    setFormOpen(true);
  }

  function openEdit(client: Client) {
    setEditingClient(client);
    setFormOpen(true);
  }

  function handleFormClose() {
    setFormOpen(false);
    setEditingClient(null);
  }

  function handleSaved(_client: Client) {
    setSuccessMessage(
      editingClient
        ? "Cliente atualizado com sucesso."
        : "Cliente criado com sucesso."
    );
    setFormOpen(false);
    setEditingClient(null);
    void loadClients();
  }

  function handleDeleted() {
    setSuccessMessage("Cliente excluído com sucesso.");
    setDeletingClient(null);
    void loadClients();
  }

  function handleInviteSent(email: string) {
    setSuccessMessage(
      email
        ? `Convite enviado para ${email}.`
        : "Convite enviado para o cliente."
    );
    setInvitingClient(null);
    void loadClients();
  }

  function handlePhotoUpdated(updated: Client) {
    setClients((prev) =>
      prev.map((client) =>
        client.id === updated.id
          ? { ...client, avatar: updated.avatar ?? null }
          : client
      )
    );
  }

  return (
    <section>
      <PageHeader
        title="Clientes"
        description="Gerencie os clientes e o acesso ao portal."
        actions={
          canCreate && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreate}
            >
              Novo cliente
            </button>
          )
        }
      />

      {successMessage && (
        <div className="alert alert-success" role="alert">
          {successMessage}
        </div>
      )}

      {!isLoading && !loadError && clients.length > 0 && (
        <div className="row g-3 dashboard-kpis">
          <div className="col-12">
            <DashboardCard
              title="Clientes na sua base"
              value={clients.length}
              icon="bi-calendar-check"
            />
          </div>
        </div>
      )}

      {isLoading && <LoadingState label="A carregar clientes…" />}

      {!isLoading && loadError && (
        <ErrorState
          message={loadError}
          onRetry={loadErrorRetryable ? () => void loadClients() : undefined}
        />
      )}

      {!isLoading && !loadError && clients.length === 0 && (
        <EmptyState
          title="Nenhum cliente cadastrado."
          description="Você ainda não possui clientes. Cadastre seu primeiro cliente para começar a criar agendamentos."
          action={
            canCreate && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={openCreate}
              >
                Cadastrar primeiro cliente
              </button>
            )
          }
        />
      )}

      {!isLoading && !loadError && clients.length > 0 && (
        <div className="card table-card mt-3">
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th scope="col">Cliente</th>
                  <th scope="col">Email</th>
                  <th scope="col">Telefone</th>
                  <th scope="col">Status</th>
                  {(canUpdate || canDelete) && <th scope="col">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <div className="person-cell">
                        <ImageAvatar
                          image={client.avatar}
                          name={client.name}
                          size="sm"
                          shape="rounded"
                          alt=""
                        />
                        <span>
                          <strong className="d-block">{client.name}</strong>
                        </span>
                      </div>
                    </td>
                    <td className="text-nowrap">{client.email ?? "—"}</td>
                    <td>{client.phone}</td>
                    <td>
                      {client.isActive ? (
                        <span className="badge text-bg-success">Ativo</span>
                      ) : (
                        <span className="badge text-bg-secondary">Inativo</span>
                      )}
                    </td>
                    {(canUpdate || canDelete) && (
                      <td>
                        <div className="table-actions">
                          {canUpdate && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => openEdit(client)}
                            >
                              Editar
                            </button>
                          )}
                          {canInvite && client.email && !client.portalAccess.exists && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => setInvitingClient(client)}
                            >
                              Convidar
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => setDeletingClient(client)}
                            >
                              Excluir
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {formOpen && (
        <ClientForm
          isOpen
          client={editingClient}
          onClose={handleFormClose}
          onSaved={handleSaved}
          onPhotoUpdated={handlePhotoUpdated}
        />
      )}

      {deletingClient && (
        <DeleteClientModal
          isOpen
          client={deletingClient}
          onClose={() => setDeletingClient(null)}
          onDeleted={handleDeleted}
        />
      )}

      {invitingClient && (
        <SendClientInviteModal
          isOpen
          client={invitingClient}
          onClose={() => setInvitingClient(null)}
          onSent={handleInviteSent}
        />
      )}
    </section>
  );
}
