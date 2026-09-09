import { useCallback, useEffect, useState } from "react";
import clientsApi from "../../api/endpoints/clients.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import ClientForm from "../../components/clients/ClientForm";
import DeleteClientModal from "../../components/clients/DeleteClientModal";
import { getClientAbilities } from "../../config/clientPermissions";
import { useAppSelector } from "../../store";
import type { Client } from "../../types/client";

export default function ClientsPage() {
  const user = useAppSelector((state) => state.auth.user);
  const { canCreate, canUpdate, canDelete } = getClientAbilities(user?.role ?? null);

  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);

  const loadClients = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await clientsApi.getClients();
      setClients(response.data ?? []);
    } catch (error) {
      const failure = getApiError(error);
      setLoadError(getFriendlyErrorMessage(failure));
    } finally {
      setIsLoading(false);
    }
  }, []);

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
        : "Cliente criado com sucesso.",
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

  return (
    <section>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h3 mb-0">Clientes</h1>
        {canCreate && (
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            Novo cliente
          </button>
        )}
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
              onClick={() => void loadClients()}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {!isLoading && !loadError && clients.length === 0 && (
        <div className="card">
          <div className="card-body text-center py-5">
            <p className="mb-3 text-muted">Nenhum cliente cadastrado.</p>
            {canCreate && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={openCreate}
              >
                Cadastrar primeiro cliente
              </button>
            )}
          </div>
        </div>
      )}

      {!isLoading && !loadError && clients.length > 0 && (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th scope="col">Cliente</th>
                <th scope="col">Email</th>
                <th scope="col">Telefone</th>
                <th scope="col">Situação</th>
                {(canUpdate || canDelete) && <th scope="col">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td>{client.name}</td>
                  <td>{client.email ?? "—"}</td>
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
                      <div className="d-flex gap-2">
                        {canUpdate && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => openEdit(client)}
                          >
                            Editar
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
      )}

      {formOpen && (
        <ClientForm
          isOpen
          client={editingClient}
          onClose={handleFormClose}
          onSaved={handleSaved}
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
    </section>
  );
}