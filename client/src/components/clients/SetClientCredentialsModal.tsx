import { useState } from "react";
import type { FormEvent } from "react";
import clientsApi from "../../api/endpoints/clients.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import type { Client } from "../../types/client";

interface FieldErrors {
  password?: string;
  confirmPassword?: string;
}

interface SetClientCredentialsModalProps {
  isOpen: boolean;
  client: Client;
  onClose: () => void;
  onSaved: (client: Client) => void;
}

function validate(password: string, confirmPassword: string): FieldErrors {
  const errors: FieldErrors = {};

  if (!password) {
    errors.password = "A senha é obrigatória.";
  } else if (password.length < 8) {
    errors.password = "A senha deve possuir pelo menos 8 caracteres.";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Confirme a senha.";
  } else if (confirmPassword !== password) {
    errors.confirmPassword = "As senhas não coincidem.";
  }

  return errors;
}

export default function SetClientCredentialsModal({
  isOpen,
  client,
  onClose,
  onSaved,
}: SetClientCredentialsModalProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleClose() {
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const errors = validate(password, confirmPassword);
    setFieldErrors(errors);

    if (errors.password || errors.confirmPassword) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await clientsApi.setClientCredentials(client.id, {
        password,
        confirmPassword,
      });
      const saved = response.data;
      if (saved) {
        onSaved(saved);
      }
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
            <h2 className="modal-title h5">Acesso ao portal do cliente</h2>
            <button
              type="button"
              className="btn-close"
              aria-label="Fechar"
              onClick={handleClose}
            />
          </div>

          <div className="modal-body">
            <p className="text-muted">
              Estas credenciais permitem que <strong>{client.name}</strong> acesse
              o portal usando o email <strong>{client.email ?? "—"}</strong>. No
              primeiro acesso, o cliente deve alterar a senha.
            </p>

            {errorMessage && (
              <div className="alert alert-danger" role="alert">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label htmlFor="client-credential-password" className="form-label">
                  Senha
                </label>
                <input
                  id="client-credential-password"
                  type="password"
                  autoComplete="new-password"
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
                  htmlFor="client-credential-confirm-password"
                  className="form-label"
                >
                  Confirmar senha
                </label>
                <input
                  id="client-credential-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  className={`form-control ${fieldErrors.confirmPassword ? "is-invalid" : ""}`}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
                {fieldErrors.confirmPassword && (
                  <div className="invalid-feedback">
                    {fieldErrors.confirmPassword}
                  </div>
                )}
              </div>

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
                  {isSubmitting ? "Definindo..." : "Definir credenciais"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}