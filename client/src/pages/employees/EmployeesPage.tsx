import { useCallback, useEffect, useState } from "react";
import employeesApi from "../../api/endpoints/employees.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import DeleteEmployeeModal from "../../components/employees/DeleteEmployeeModal";
import EmployeeForm from "../../components/employees/EmployeeForm";
import { getEmployeeAbilities } from "../../config/employeePermissions";
import { useAppSelector } from "../../store";
import type { Employee } from "../../types/employee";
import type { Role } from "../../types/auth";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import ImageAvatar from "../../components/common/ImageAvatar";
import DashboardCard from "../../components/common/DashboardCard";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("pt-PT");
}

const ROLE_BADGE_CLASS: Record<Role, string> = {
  OWNER: "text-bg-primary",
  ADMIN: "text-bg-info",
  MANAGER: "text-bg-warning",
  EMPLOYEE: "text-bg-secondary",
  CLIENT: "text-bg-dark",
};

export default function EmployeesPage() {
  const currentUser = useAppSelector((state) => state.auth.user);
  const actorRole = currentUser?.role ?? null;
  const { canList, canCreate, canEdit, canActivate, canDeactivate, canDelete } =
    getEmployeeAbilities(actorRole);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(
    null
  );
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await employeesApi.getEmployees();
      /**
       * O backend já exclui CLIENT da listagem de funcionários; este
       * filtro defensivo garante que contas de acesso ao Portal do
       * Cliente nunca sejam tratadas como funcionários na interface.
       */
      setEmployees((response.data ?? []).filter((e) => e.role !== "CLIENT"));
    } catch (error) {
      const failure = getApiError(error);
      setLoadError(getFriendlyErrorMessage(failure));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canList) {
      return;
    }
    void loadEmployees();
  }, [canList, loadEmployees]);

  function openCreate() {
    setEditingEmployee(null);
    setFormOpen(true);
  }

  function openEdit(employee: Employee) {
    setEditingEmployee(employee);
    setFormOpen(true);
  }

  function handleFormClose() {
    setFormOpen(false);
    setEditingEmployee(null);
  }

  function handleSaved() {
    setSuccessMessage(
      editingEmployee
        ? "Funcionário atualizado com sucesso."
        : "Funcionário criado com sucesso."
    );
    setFormOpen(false);
    setEditingEmployee(null);
    void loadEmployees();
  }

  function handleDeleted() {
    setSuccessMessage("Funcionário excluído com sucesso.");
    setDeletingEmployee(null);
    void loadEmployees();
  }

  function handlePhotoUpdated(updated: Employee) {
    setEmployees((prev) =>
      prev.map((employee) =>
        employee.id === updated.id
          ? { ...employee, avatar: updated.avatar ?? null }
          : employee
      )
    );
  }

  async function handleToggle(employee: Employee, activate: boolean) {
    setActionError(null);
    setTogglingId(employee.id);
    try {
      if (activate) {
        await employeesApi.activateEmployee(employee.id);
        setSuccessMessage("Funcionário ativado com sucesso.");
      } else {
        await employeesApi.deactivateEmployee(employee.id);
        setSuccessMessage("Funcionário desativado com sucesso.");
      }
      void loadEmployees();
    } catch (error) {
      const failure = getApiError(error);
      setActionError(getFriendlyErrorMessage(failure));
    } finally {
      setTogglingId(null);
    }
  }

  if (!canList) {
    return (
      <section>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="h3 mb-0">Funcionários</h1>
        </div>
        <div className="alert alert-warning" role="alert">
          Você não tem permissão para acessar esta página.
        </div>
      </section>
    );
  }

  const actionsVisible = canEdit || canActivate || canDeactivate || canDelete;
  const activeCount = employees.filter(
    (employee) => employee.isActive !== false
  ).length;
  const managerCount = employees.filter(
    (employee) => employee.role === "MANAGER"
  ).length;

  return (
    <section>
      <PageHeader
        title="Funcionários"
        description="Organize a equipa e as permissões de acesso ao sistema."
        actions={
          canCreate && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreate}
            >
              Novo funcionário
            </button>
          )
        }
      />

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

      {!isLoading && !loadError && employees.length > 0 && (
        <div className="row g-3 dashboard-kpis">
          <div className="col-12 col-md-4">
            <DashboardCard
              title="Total da equipa"
              value={employees.length}
              icon="bi-calendar-check"
            />
          </div>
          <div className="col-12 col-md-4">
            <DashboardCard title="Ativos" value={activeCount} icon="bi-clock" />
          </div>
          <div className="col-12 col-md-4">
            <DashboardCard
              title="Managers"
              value={managerCount}
              icon="bi-check-circle"
            />
          </div>
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
              onClick={() => void loadEmployees()}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {!isLoading && !loadError && employees.length === 0 && (
        <EmptyState
          title="Nenhum funcionário cadastrado."
          description="Você ainda não possui funcionários. Adicione a equipa que participa dos seus agendamentos."
          action={
            canCreate && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={openCreate}
              >
                Cadastrar primeiro funcionário
              </button>
            )
          }
        />
      )}

      {!isLoading && !loadError && employees.length > 0 && (
        <div className="card table-card mt-3">
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th scope="col">Funcionário</th>
                  <th scope="col">E-mail</th>
                  <th scope="col">Perfil</th>
                  <th scope="col">Status</th>
                  <th scope="col">Adicionado em</th>
                  {actionsVisible && <th scope="col">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => {
                  const isSelf = employee.id === currentUser?.id;
                  return (
                    <tr key={employee.id}>
                      <td>
                        <div className="person-cell">
                          <ImageAvatar
                            image={employee.avatar}
                            name={employee.name}
                            size="sm"
                            shape="rounded"
                            alt=""
                          />
                          <span>
                            <strong className="d-block">{employee.name}</strong>
                            {isSelf && (
                              <span className="table-subline">Você</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td>{employee.email}</td>
                      <td>
                        <span
                          className={`badge ${ROLE_BADGE_CLASS[employee.role]}`}
                        >
                          {employee.role}
                        </span>
                      </td>
                      <td>
                        {employee.isActive === false ? (
                          <span className="badge text-bg-secondary">
                            Inativo
                          </span>
                        ) : (
                          <span className="badge text-bg-success">Ativo</span>
                        )}
                      </td>
                      <td>{formatDate(employee.createdAt)}</td>
                      {actionsVisible && (
                        <td>
                          <div className="table-actions">
                            {canEdit && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => openEdit(employee)}
                                disabled={togglingId === employee.id}
                              >
                                Editar
                              </button>
                            )}
                            {!isSelf &&
                              canDeactivate &&
                              employee.isActive !== false && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() =>
                                    void handleToggle(employee, false)
                                  }
                                  disabled={togglingId === employee.id}
                                >
                                  {togglingId === employee.id
                                    ? "Aguarde..."
                                    : "Desativar"}
                                </button>
                              )}
                            {!isSelf &&
                              canActivate &&
                              employee.isActive === false && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-success"
                                  onClick={() =>
                                    void handleToggle(employee, true)
                                  }
                                  disabled={togglingId === employee.id}
                                >
                                  {togglingId === employee.id
                                    ? "Aguarde..."
                                    : "Ativar"}
                                </button>
                              )}
                            {!isSelf && canDelete && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => setDeletingEmployee(employee)}
                                disabled={togglingId === employee.id}
                              >
                                Excluir
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {formOpen && (
        <EmployeeForm
          isOpen
          employee={editingEmployee}
          actorRole={actorRole}
          currentUserId={currentUser?.id ?? null}
          onClose={handleFormClose}
          onSaved={handleSaved}
          onPhotoUpdated={handlePhotoUpdated}
        />
      )}

      {deletingEmployee && (
        <DeleteEmployeeModal
          isOpen
          employee={deletingEmployee}
          onClose={() => setDeletingEmployee(null)}
          onDeleted={handleDeleted}
        />
      )}
    </section>
  );
}
