import { useState } from "react";
import type { FormEvent } from "react";
import employeesApi from "../../api/endpoints/employees.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import {
  canAssignEmployeeRole,
  getAssignableEmployeeRoles,
} from "../../config/employeePermissions";
import type { Employee } from "../../types/employee";
import type { Role } from "../../types/auth";

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface EmployeeFormProps {
  isOpen: boolean;
  employee: Employee | null;
  actorRole: Role | null;
  currentUserId: string | null;
  onClose: () => void;
  onSaved: (employee: Employee) => void;
}

const NAME_MIN = 3;
const NAME_MAX = 120;
const PASSWORD_MIN = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(
  name: string,
  email: string,
  password: string,
  confirmPassword: string,
  isEdit: boolean,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!name.trim()) {
    errors.name = "O nome é obrigatório.";
  } else if (name.trim().length < NAME_MIN || name.trim().length > NAME_MAX) {
    errors.name = `O nome deve possuir entre ${NAME_MIN} e ${NAME_MAX} caracteres.`;
  }

  if (!email.trim()) {
    errors.email = "O e-mail é obrigatório.";
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = "O e-mail é inválido.";
  }

  if (!isEdit) {
    if (!password) {
      errors.password = "A senha é obrigatória.";
    } else if (password.length < PASSWORD_MIN) {
      errors.password = `A senha deve possuir pelo menos ${PASSWORD_MIN} caracteres.`;
    }

    if (!confirmPassword) {
      errors.confirmPassword = "A confirmação de senha é obrigatória.";
    } else if (confirmPassword !== password) {
      errors.confirmPassword = "As senhas não coincidem.";
    }
  }

  return errors;
}

export default function EmployeeForm({
  isOpen,
  employee,
  actorRole,
  currentUserId,
  onClose,
  onSaved,
}: EmployeeFormProps) {
  const isEdit = Boolean(employee);
  const isSelf = isEdit && employee!.id === currentUserId;
  const assignableRoles = getAssignableEmployeeRoles(actorRole);
  const roleEditingAllowed = isEdit && employee
    ? !isSelf && canAssignEmployeeRole(actorRole, employee.role)
    : false;

  const initialRole =
    employee?.role ?? (assignableRoles.includes("EMPLOYEE")
      ? "EMPLOYEE"
      : (assignableRoles[0] ?? "EMPLOYEE"));

  const [name, setName] = useState(employee?.name ?? "");
  const [email, setEmail] = useState(employee?.email ?? "");
  const [role, setRole] = useState<Role>(initialRole);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleOptions = Array.from(
    new Set([
      ...(isEdit && employee ? [employee.role] : []),
      ...assignableRoles,
    ]),
  );

  function handleClose() {
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const errors = validate(
      name,
      email,
      password,
      confirmPassword,
      isEdit,
    );
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const normalizedName = name.trim();
      const normalizedEmail = email.trim().toLowerCase();

      if (isEdit) {
        const payload: {
          name: string;
          email: string;
          role?: Role;
        } = {
          name: normalizedName,
          email: normalizedEmail,
        };
        if (roleEditingAllowed && employee && role !== employee.role) {
          payload.role = role;
        }
        const response = await employeesApi.updateEmployee(employee!.id, payload);
        const saved = response.data;
        if (saved) {
          onSaved(saved);
        }
      } else {
        const response = await employeesApi.createEmployee({
          name: normalizedName,
          email: normalizedEmail,
          password,
          confirmPassword,
          role,
        });
        const saved = response.data;
        if (saved) {
          onSaved(saved);
        }
      }
      setPassword("");
      setConfirmPassword("");
      handleClose();
    } catch (error) {
      const failure = getApiError(error);
      setErrorMessage(getFriendlyErrorMessage(failure));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal show d-block" role="dialog" aria-modal="true">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title h5">
              {isEdit ? "Editar funcionário" : "Novo funcionário"}
            </h2>
            <button
              type="button"
              className="btn-close"
              aria-label="Fechar"
              onClick={handleClose}
            />
          </div>

          <div className="modal-body">
            {errorMessage && (
              <div className="alert alert-danger" role="alert">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label htmlFor="employee-name" className="form-label">
                  Nome
                </label>
                <input
                  id="employee-name"
                  type="text"
                  className={`form-control ${fieldErrors.name ? "is-invalid" : ""}`}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                {fieldErrors.name && (
                  <div className="invalid-feedback">{fieldErrors.name}</div>
                )}
              </div>

              <div className="mb-3">
                <label htmlFor="employee-email" className="form-label">
                  E-mail
                </label>
                <input
                  id="employee-email"
                  type="email"
                  className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                {fieldErrors.email && (
                  <div className="invalid-feedback">{fieldErrors.email}</div>
                )}
              </div>

              <div className="mb-3">
                <label htmlFor="employee-role" className="form-label">
                  Perfil
                </label>
                <select
                  id="employee-role"
                  className="form-select"
                  value={role}
                  onChange={(event) => setRole(event.target.value as Role)}
                  disabled={isEdit && !roleEditingAllowed}
                >
                  {roleOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {isEdit && !roleEditingAllowed && (
                  <div className="form-text">
                    O perfil não pode ser alterado para este funcionário.
                  </div>
                )}
              </div>

              {!isEdit && (
                <>
                  <div className="mb-3">
                    <label htmlFor="employee-password" className="form-label">
                      Senha
                    </label>
                    <input
                      id="employee-password"
                      type="password"
                      className={`form-control ${fieldErrors.password ? "is-invalid" : ""}`}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                    {fieldErrors.password && (
                      <div className="invalid-feedback">{fieldErrors.password}</div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label
                      htmlFor="employee-confirm-password"
                      className="form-label"
                    >
                      Confirmação de senha
                    </label>
                    <input
                      id="employee-confirm-password"
                      type="password"
                      className={`form-control ${fieldErrors.confirmPassword ? "is-invalid" : ""}`}
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                    />
                    {fieldErrors.confirmPassword && (
                      <div className="invalid-feedback">
                        {fieldErrors.confirmPassword}
                      </div>
                    )}
                  </div>

                  {role === "EMPLOYEE" && (
                    <div className="form-text mb-3">
                      Funcionários devem alterar a senha no primeiro acesso.
                    </div>
                  )}
                </>
              )}

              <div className="modal-footer px-0 pb-0 d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <span
                      className="spinner-border spinner-border-sm me-1"
                      role="status"
                      aria-hidden="true"
                    />
                  )}
                  {isSubmitting
                    ? isEdit
                      ? "Salvando..."
                      : "Criando..."
                    : isEdit
                      ? "Salvar"
                      : "Criar funcionário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}