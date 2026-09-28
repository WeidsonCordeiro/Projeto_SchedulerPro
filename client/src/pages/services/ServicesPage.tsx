import { useCallback, useEffect, useState } from "react";
import servicesApi from "../../api/endpoints/services.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import ServiceForm from "../../components/services/ServiceForm";
import DeleteServiceModal from "../../components/services/DeleteServiceModal";
import { getServiceAbilities } from "../../config/servicePermissions";
import { useAppSelector } from "../../store";
import type { Service } from "../../types/service";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";

function formatPrice(price: number): string {
  return price.toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ServicesPage() {
  const user = useAppSelector((state) => state.auth.user);
  const { canCreate, canUpdate, canDelete } = getServiceAbilities(
    user?.role ?? null,
  );

  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await servicesApi.getServices();
      setServices(response.data ?? []);
    } catch (error) {
      const failure = getApiError(error);
      setLoadError(getFriendlyErrorMessage(failure));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  function openCreate() {
    setEditingService(null);
    setFormOpen(true);
  }

  function openEdit(service: Service) {
    setEditingService(service);
    setFormOpen(true);
  }

  function handleFormClose() {
    setFormOpen(false);
    setEditingService(null);
  }

  function handleSaved(_service: Service) {
    setSuccessMessage(
      editingService
        ? "Serviço atualizado com sucesso."
        : "Serviço criado com sucesso.",
    );
    setFormOpen(false);
    setEditingService(null);
    void loadServices();
  }

  function handleDeleted() {
    setSuccessMessage("Serviço excluído com sucesso.");
    setDeletingService(null);
    void loadServices();
  }

  async function handleToggleActive(service: Service) {
    setActionError(null);
    setTogglingId(service.id);
    try {
      if (service.isActive) {
        await servicesApi.deactivateService(service.id);
        setSuccessMessage("Serviço desativado com sucesso.");
      } else {
        await servicesApi.activateService(service.id);
        setSuccessMessage("Serviço ativado com sucesso.");
      }
      void loadServices();
    } catch (error) {
      const failure = getApiError(error);
      setActionError(getFriendlyErrorMessage(failure));
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <section>
      <PageHeader title="Serviços" description="Defina os serviços, durações e preços oferecidos pela empresa." actions={canCreate && <button type="button" className="btn btn-primary" onClick={openCreate}>Novo serviço</button>} />

      {successMessage && (
        <div className="alert alert-success" role="alert">
          {successMessage}
        </div>
      )}

      {actionError && (
        <div className="alert alert-danger" role="alert">
          {actionError}
        </div>
      )}

      {!isLoading && !loadError && services.length > 0 && (
        <div className="service-summary mb-3"><span><strong>{services.filter((service) => service.isActive).length}</strong> serviços ativos</span><span><strong>{services.length}</strong> no catálogo</span></div>
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
              onClick={() => void loadServices()}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {!isLoading && !loadError && services.length === 0 && (
        <EmptyState title="Nenhum serviço cadastrado." description="Você ainda não possui serviços. Cadastre os serviços oferecidos para agilizar novos agendamentos." action={canCreate && <button type="button" className="btn btn-primary" onClick={openCreate}>Cadastrar primeiro serviço</button>} />
      )}

      {!isLoading && !loadError && services.length > 0 && (
        <div className="card table-card">
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th scope="col">Serviço</th>
                  <th scope="col">Duração</th>
                  <th scope="col">Preço</th>
                  <th scope="col">Status</th>
                  {(canUpdate || canDelete) && <th scope="col">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id}>
                    <td>
                      {service.name}
                      {service.description && (
                        <span className="table-subline">{service.description}</span>
                      )}
                    </td>
                    <td>{service.duration} min</td>
                    <td>{formatPrice(service.price)}</td>
                    <td>
                      {service.isActive ? (
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
                              onClick={() => openEdit(service)}
                              disabled={togglingId === service.id}
                            >
                              Editar
                            </button>
                          )}
                          {canUpdate && (
                            <button
                              type="button"
                              className={`btn btn-sm ${service.isActive ? "btn-outline-secondary" : "btn-outline-success"}`}
                              onClick={() => void handleToggleActive(service)}
                              disabled={togglingId === service.id}
                            >
                              {togglingId === service.id
                                ? "Aguarde..."
                                : service.isActive
                                  ? "Desativar"
                                  : "Ativar"}
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => setDeletingService(service)}
                              disabled={togglingId === service.id}
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
        <ServiceForm
          isOpen
          service={editingService}
          onClose={handleFormClose}
          onSaved={handleSaved}
        />
      )}

      {deletingService && (
        <DeleteServiceModal
          isOpen
          service={deletingService}
          onClose={() => setDeletingService(null)}
          onDeleted={handleDeleted}
        />
      )}
    </section>
  );
}
