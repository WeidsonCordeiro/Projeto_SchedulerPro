import { useState } from "react";
import type { FormEvent } from "react";
import clientsApi from "../../api/endpoints/clients.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import type { Client } from "../../types/client";

interface FieldErrors {
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

interface ClientFormProps {
  isOpen: boolean;
  client: Client | null;
  onClose: () => void;
  onSaved: (client: Client) => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(
  name: string,
  email: string,
  phone: string,
  notes: string,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!name.trim()) {
    errors.name = "O nome do cliente é obrigatório.";
  } else if (name.trim().length < 2 || name.trim().length > 100) {
    errors.name = "O nome deve ter entre 2 e 100 caracteres.";
  }

  if (!phone.trim()) {
    errors.phone = "O telefone do cliente é obrigatório.";
  } else if (phone.trim().length < 8 || phone.trim().length > 20) {
    errors.phone = "O telefone deve ter entre 8 e 20 caracteres.";
  }

  if (email && !EMAIL_PATTERN.test(email)) {
    errors.email = "O e-mail informado é inválido.";
  }

  if (notes.length > 500) {
    errors.notes = "As observações devem ter no máximo 500 caracteres.";
  }

  return errors;
}

export default function ClientForm({
  isOpen,
  client,
  onClose,
  onSaved,
}: ClientFormProps) {
  const isEdit = Boolean(client);
  const [name, setName] = useState(client?.name ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [notes, setNotes] = useState(client?.notes ?? "");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleClose() {
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const errors = validate(name, email, phone, notes);
    setFieldErrors(errors);

    if (errors.name || errors.email || errors.phone || errors.notes) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim(),
        notes: notes.trim() || undefined,
      };
      const response = isEdit
        ? await clientsApi.updateClient(client!.id, payload)
        : await clientsApi.createClient(payload);
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
            <h2 className="modal-title h5">
              {isEdit ? "Editar cliente" : "Novo cliente"}
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
                <label htmlFor="client-name" className="form-label">
                  Nome
                </label>
                <input
                  id="client-name"
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
                <label htmlFor="client-email" className="form-label">
                  Email
                </label>
                <input
                  id="client-email"
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
                <label htmlFor="client-phone" className="form-label">
                  Telefone
                </label>
                <input
                  id="client-phone"
                  type="text"
                  className={`form-control ${fieldErrors.phone ? "is-invalid" : ""}`}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
                {fieldErrors.phone && (
                  <div className="invalid-feedback">{fieldErrors.phone}</div>
                )}
              </div>

              <div className="mb-3">
                <label htmlFor="client-notes" className="form-label">
                  Observações
                </label>
                <textarea
                  id="client-notes"
                  className={`form-control ${fieldErrors.notes ? "is-invalid" : ""}`}
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
                {fieldErrors.notes && (
                  <div className="invalid-feedback">{fieldErrors.notes}</div>
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
                  {isSubmitting
                    ? isEdit
                      ? "Salvando..."
                      : "Criando..."
                    : isEdit
                      ? "Salvar"
                      : "Criar cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}