import { useCallback, useEffect, useState } from "react";
import employeesApi from "../../api/endpoints/employees.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import DeleteEmployeeModal from "../../components/employees/DeleteEmployeeModal";
import EmployeeForm from "../../components/employees/EmployeeForm";
import { getEmployeeAbilities } from "../../config/employeePermissions";
import { useAppSelector } from "../../store";
import type { Employee } from "../../types/employee";
import type { Role } from "../../types/auth";

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
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await employeesApi.getEmployees();
      setEmployees(response.data ?? []);
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
        : "Funcionário criado com sucesso.",
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

  return (
    <section>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h3 mb-0">Funcionários</h1>
        {canCreate && (
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            Novo funcionário
          </button>
        )}
      </div>

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
        <div className="card">
          <div className="card-body text-center py-5">
            <p className="mb-3 text-muted">Nenhum funcionário cadastrado.</p>
            {canCreate && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={openCreate}
              >
                Cadastrar primeiro funcionário
              </button>
            )}
          </div>
        </div>
      )}

      {!isLoading && !loadError && employees.length > 0 && (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th scope="col">Funcionário</th>
                <th scope="col">E-mail</th>
                <th scope="col">Perfil</th>
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
                      {employee.name}
                      {isSelf && (
                        <span className="small text-muted"> (você)</span>
                      )}
                    </td>
                    <td>{employee.email}</td>
                    <td>
                      <span className={`badge ${ROLE_BADGE_CLASS[employee.role]}`}>
                        {employee.role}
                      </span>
                    </td>
                    <td>{formatDate(employee.createdAt)}</td>
                    {actionsVisible && (
                      <td>
                        <div className="d-flex gap-2">
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
                          {!isSelf && canActivate && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => void handleToggle(employee, false)}
                              disabled={togglingId === employee.id}
                            >
                              {togglingId === employee.id
                                ? "Aguarde..."
                                : "Desativar"}
                            </button>
                          )}
                          {!isSelf && canDeactivate && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success"
                              onClick={() => void handleToggle(employee, true)}
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
      )}

      {formOpen && (
        <EmployeeForm
          isOpen
          employee={editingEmployee}
          actorRole={actorRole}
          currentUserId={currentUser?.id ?? null}
          onClose={handleFormClose}
          onSaved={handleSaved}
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